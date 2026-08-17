import { decryptSecret } from "@/lib/secret-encryption";
import { normalizePhoneNumber } from "@/lib/phone";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

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
}
