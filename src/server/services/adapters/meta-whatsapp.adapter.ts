import { decryptSecret } from "@/lib/secret-encryption";
import { normalizePhoneNumber } from "@/lib/phone";
import type { WhatsAppAdapter, WhatsAppMediaInput, WhatsAppSendResult } from "./whatsapp-adapter.types";

const GRAPH_API_VERSION = "v25.0";
const NOT_CONFIGURED_NOTE = "Nenhum provedor real conectado — mensagem simulada, não foi enviada de fato.";

type MetaConfig = { phoneNumberId: string | null; accessTokenEncrypted: string | null };

type MetaApiSuccess = { messages: { id: string }[] };
type MetaApiError = { error: { message: string; type: string; code: number; error_subcode?: number } };

/**
 * Real Meta Cloud API calls — `POST /{phoneNumberId}/messages`. A successful
 * response here only means Meta *accepted* the message; final delivery is
 * reported asynchronously via webhook (see whatsapp.service.ts
 * processWebhookPayload), which is also where a "failed" status and its
 * real reason (e.g. an unverified Business Manager account being
 * restricted from messaging a given country) show up — confirmed live
 * against a real Meta test app.
 *
 * sendTemplateMessage requires a template with a matching name already
 * created and approved in Meta Business Manager — WHATSAPP_TEMPLATES in
 * whatsapp.service.ts is only the local display text, it does not create
 * one. Until an approved template exists, Meta will reject the call with a
 * clear "template not found" error rather than anything faked here.
 */
export class MetaWhatsAppAdapter implements WhatsAppAdapter {
  constructor(private config: MetaConfig) {}

  private async send(body: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const { phoneNumberId, accessTokenEncrypted } = this.config;
    if (!phoneNumberId || !accessTokenEncrypted) {
      return { providerMessageId: null, status: "SIMULATED", errorMessage: NOT_CONFIGURED_NOTE };
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(accessTokenEncrypted);
    } catch (error) {
      return { providerMessageId: null, status: "FAILED", errorMessage: `Falha ao decifrar o token de acesso: ${(error as Error).message}` };
    }

    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      return { providerMessageId: null, status: "FAILED", errorMessage: `Não foi possível conectar à Meta Graph API: ${(error as Error).message}` };
    }

    const json = (await response.json()) as MetaApiSuccess | MetaApiError;
    if (!response.ok || "error" in json) {
      const message = "error" in json ? json.error.message : `Meta retornou HTTP ${response.status}.`;
      return { providerMessageId: null, status: "FAILED", errorMessage: message };
    }

    return { providerMessageId: json.messages[0]?.id ?? null, status: "SENT" };
  }

  async sendTemplateMessage(to: string, templateName: string, variables: Record<string, string>): Promise<WhatsAppSendResult> {
    const parameters = Object.values(variables).map((value) => ({ type: "text", text: value }));
    return this.send({
      to: normalizePhoneNumber(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: "pt_BR" },
        ...(parameters.length ? { components: [{ type: "body", parameters }] } : {}),
      },
    });
  }

  async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    return this.send({ to: normalizePhoneNumber(to), type: "text", text: { body: message } });
  }

  /**
   * Media send is two Graph API calls: upload the bytes to get a short-lived
   * `media_id`, then send a message referencing it — Meta doesn't accept
   * inline bytes on the /messages endpoint. `type` (image vs. document) is
   * derived from the mime type since that's what determines which JSON key
   * Meta expects the id to be nested under.
   */
  async sendMediaMessage(to: string, media: WhatsAppMediaInput, caption?: string): Promise<WhatsAppSendResult> {
    const { phoneNumberId, accessTokenEncrypted } = this.config;
    if (!phoneNumberId || !accessTokenEncrypted) {
      return { providerMessageId: null, status: "SIMULATED", errorMessage: NOT_CONFIGURED_NOTE };
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(accessTokenEncrypted);
    } catch (error) {
      return { providerMessageId: null, status: "FAILED", errorMessage: `Falha ao decifrar o token de acesso: ${(error as Error).message}` };
    }

    let mediaId: string;
    try {
      mediaId = await this.uploadMedia(phoneNumberId, accessToken, media);
    } catch (error) {
      return { providerMessageId: null, status: "FAILED", errorMessage: `Falha ao enviar o arquivo para a Meta: ${(error as Error).message}` };
    }

    const type = metaMediaType(media.mimeType);
    const mediaObject: Record<string, unknown> = { id: mediaId };
    if (caption) mediaObject.caption = caption;
    if (type === "document") mediaObject.filename = media.fileName;

    return this.send({ to: normalizePhoneNumber(to), type, [type]: mediaObject });
  }

  private async uploadMedia(phoneNumberId: string, accessToken: string, media: WhatsAppMediaInput): Promise<string> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("file", new Blob([Uint8Array.from(media.buffer)], { type: media.mimeType }), media.fileName);

    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await response.json()) as { id?: string } | MetaApiError;
    if (!response.ok || !("id" in json) || !json.id) {
      const message = "error" in json ? json.error.message : `Meta retornou HTTP ${response.status} ao subir a mídia.`;
      throw new Error(message);
    }
    return json.id;
  }

  /**
   * Only on this adapter, not the shared WhatsAppAdapter interface — inbound
   * webhook handling is already 100% Meta-specific (see MetaWebhookMessage
   * in whatsapp.service.ts), so Twilio/Generic never need this method.
   * Two calls: fetch the media's metadata (which includes a short-lived
   * download URL), then fetch that URL — both need the same bearer token,
   * the download URL is not itself public.
   */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const { accessTokenEncrypted } = this.config;
    if (!accessTokenEncrypted) throw new Error(NOT_CONFIGURED_NOTE);
    const accessToken = decryptSecret(accessTokenEncrypted);

    const metaResponse = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const metaJson = (await metaResponse.json()) as { url?: string; mime_type?: string } | MetaApiError;
    if (!metaResponse.ok || !("url" in metaJson) || !metaJson.url) {
      const message = "error" in metaJson ? metaJson.error.message : `Meta retornou HTTP ${metaResponse.status} ao buscar metadados da mídia.`;
      throw new Error(message);
    }

    const fileResponse = await fetch(metaJson.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!fileResponse.ok) throw new Error(`Meta retornou HTTP ${fileResponse.status} ao baixar a mídia.`);
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    return { buffer, mimeType: metaJson.mime_type ?? "application/octet-stream" };
  }
}

function metaMediaType(mimeType: string): "image" | "document" {
  return mimeType.startsWith("image/") ? "image" : "document";
}
