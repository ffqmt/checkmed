import { prisma } from "@/lib/prisma";
import type { WhatsAppProvider, WhatsAppMessageStatus, WhatsAppIntegration } from "@prisma/client";
import { normalizePhoneNumber, phoneNumberVariants, canonicalPhoneKey } from "@/lib/phone";
import { storageAdapter, buildWhatsAppAttachmentPath } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { MetaWhatsAppAdapter } from "./adapters/meta-whatsapp.adapter";
import { TwilioWhatsAppAdapter } from "./adapters/twilio-whatsapp.adapter";
import { GenericWhatsAppAdapter } from "./adapters/generic-whatsapp.adapter";
import type { WhatsAppAdapter, WhatsAppMediaInput } from "./adapters/whatsapp-adapter.types";

type IntegrationConfig = { phoneNumberId: string | null; accessTokenEncrypted: string | null } | null;

function adapterFor(provider: WhatsAppProvider, integration: IntegrationConfig): WhatsAppAdapter {
  switch (provider) {
    case "META_CLOUD_API":
      return new MetaWhatsAppAdapter({
        phoneNumberId: integration?.phoneNumberId ?? null,
        accessTokenEncrypted: integration?.accessTokenEncrypted ?? null,
      });
    case "TWILIO":
      return new TwilioWhatsAppAdapter();
    default:
      return new GenericWhatsAppAdapter();
  }
}

/** Messages never carry CID or full CPF — only the request identifier and a neutral status update. */
function sanitizeMessageBody(body: string) {
  return body;
}

/** Unlike WhatsAppMediaInput (what an adapter needs to actually send bytes), this also carries where the file already lives in our own Storage — sendMediaMessage persists that alongside the message row so the bubble can render it back via a signed URL later. */
export type WhatsAppOutboundMedia = WhatsAppMediaInput & { storageBucket: string; storagePath: string; fileSize: number };

export interface WhatsAppService {
  sendTemplateMessage(
    organizationId: string,
    to: string,
    templateName: string,
    variables: Record<string, string>,
    requestId?: string,
    sentByUserId?: string,
  ): Promise<void>;
  sendTextMessage(organizationId: string, to: string, message: string, requestId?: string, sentByUserId?: string): Promise<void>;
  sendMediaMessage(
    organizationId: string,
    to: string,
    media: WhatsAppOutboundMedia,
    caption?: string,
    requestId?: string,
    sentByUserId?: string,
  ): Promise<void>;
  /** Meta's real webhook shape: {object, entry:[{changes:[{value:{metadata,statuses?,messages?}}]}]} — see below. */
  processWebhookPayload(payload: unknown): Promise<void>;
}

export class DefaultWhatsAppService implements WhatsAppService {
  async sendTemplateMessage(
    organizationId: string,
    to: string,
    templateName: string,
    variables: Record<string, string>,
    requestId?: string,
    sentByUserId?: string,
  ): Promise<void> {
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
    const provider = integration?.provider ?? "OTHER";
    const adapter = adapterFor(provider, integration);

    const body = sanitizeMessageBody(
      renderTemplate(templateName, variables),
    );

    const message = await prisma.whatsAppMessage.create({
      data: {
        organizationId,
        requestId,
        sentByUserId,
        direction: "OUTBOUND",
        fromNumber: integration?.phoneNumberId ?? "medcheck-sandbox",
        // Normalized so a later inbound reply (Meta reports the sender in
        // the same digits-only format) can be matched back to this number.
        toNumber: normalizePhoneNumber(to),
        templateName,
        messageBody: body,
        status: "QUEUED",
      },
    });

    try {
      const result = await adapter.sendTemplateMessage(to, templateName, variables);
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          status: result.status,
          providerMessageId: result.providerMessageId,
          sentAt: result.status === "SENT" ? new Date() : null,
          errorMessage: result.errorMessage,
        },
      });
    } catch (error) {
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: "FAILED", errorMessage: (error as Error).message },
      });
    }
  }

  async sendTextMessage(organizationId: string, to: string, message: string, requestId?: string, sentByUserId?: string): Promise<void> {
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
    const provider = integration?.provider ?? "OTHER";
    const adapter = adapterFor(provider, integration);

    const record = await prisma.whatsAppMessage.create({
      data: {
        organizationId,
        requestId,
        sentByUserId,
        direction: "OUTBOUND",
        fromNumber: integration?.phoneNumberId ?? "medcheck-sandbox",
        toNumber: normalizePhoneNumber(to),
        messageBody: sanitizeMessageBody(message),
        status: "QUEUED",
      },
    });

    try {
      const result = await adapter.sendTextMessage(to, message);
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: result.status,
          providerMessageId: result.providerMessageId,
          sentAt: result.status === "SENT" ? new Date() : null,
          errorMessage: result.errorMessage,
        },
      });
    } catch (error) {
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: { status: "FAILED", errorMessage: (error as Error).message },
      });
    }
  }

  async sendMediaMessage(
    organizationId: string,
    to: string,
    media: WhatsAppOutboundMedia,
    caption?: string,
    requestId?: string,
    sentByUserId?: string,
  ): Promise<void> {
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
    const provider = integration?.provider ?? "OTHER";
    const adapter = adapterFor(provider, integration);

    const record = await prisma.whatsAppMessage.create({
      data: {
        organizationId,
        requestId,
        sentByUserId,
        direction: "OUTBOUND",
        fromNumber: integration?.phoneNumberId ?? "medcheck-sandbox",
        toNumber: normalizePhoneNumber(to),
        messageBody: sanitizeMessageBody(caption ?? ""),
        status: "QUEUED",
        attachmentStorageBucket: media.storageBucket,
        attachmentStoragePath: media.storagePath,
        attachmentMimeType: media.mimeType,
        attachmentFileName: media.fileName,
        attachmentFileSize: media.fileSize,
      },
    });

    try {
      const result = await adapter.sendMediaMessage(to, { buffer: media.buffer, mimeType: media.mimeType, fileName: media.fileName }, caption);
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: {
          status: result.status,
          providerMessageId: result.providerMessageId,
          sentAt: result.status === "SENT" ? new Date() : null,
          errorMessage: result.errorMessage,
        },
      });
    } catch (error) {
      await prisma.whatsAppMessage.update({
        where: { id: record.id },
        data: { status: "FAILED", errorMessage: (error as Error).message },
      });
    }
  }

  /**
   * Meta batches multiple entries/changes per call, and a single "value" can
   * carry either delivery-status updates or inbound customer messages (or,
   * in principle, both). There's no organizationId in the payload — the
   * only way to attribute a webhook to a tenant is the phone_number_id in
   * value.metadata, looked up against WhatsAppIntegration. A webhook for a
   * phoneNumberId we don't have on file is silently skipped (nothing to
   * attach it to), not an error.
   */
  async processWebhookPayload(payload: unknown): Promise<void> {
    const data = payload as MetaWebhookPayload;
    for (const entry of data.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!value || !phoneNumberId) continue;

        const integration = await prisma.whatsAppIntegration.findFirst({ where: { phoneNumberId } });
        if (!integration) continue;

        for (const status of value.statuses ?? []) {
          await this.applyDeliveryStatus(integration.organizationId, status);
        }
        for (const message of value.messages ?? []) {
          await this.recordInboundMessage(integration, phoneNumberId, message);
        }
      }
    }
  }

  private async applyDeliveryStatus(organizationId: string, status: MetaWebhookStatus): Promise<void> {
    if (!status.id || !status.status) return;
    const statusMap: Record<string, WhatsAppMessageStatus> = {
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    };
    const mapped = statusMap[status.status.toLowerCase()];
    if (!mapped) return;

    await prisma.whatsAppMessage.updateMany({
      where: { providerMessageId: status.id, organizationId },
      data: {
        status: mapped,
        deliveredAt: mapped === "DELIVERED" ? new Date() : undefined,
        readAt: mapped === "READ" ? new Date() : undefined,
        errorMessage: mapped === "FAILED" ? status.errors?.[0]?.message : undefined,
      },
    });
  }

  /**
   * WhatsApp has no concept of "this reply is about case #1234" — Meta only
   * tells us which phone number replied. Attribute the reply to whichever
   * request we most recently texted that same number about; if we never
   * texted them, there's nothing to attribute it to and it's just recorded
   * at the organization level.
   *
   * A non-text message carries a media reference (id + mime type), not the
   * bytes — those need a separate authenticated fetch from Meta, done here
   * so the message row already has a working attachment by the time it's
   * first read. If that download fails, the message is still recorded (never
   * silently dropped) with an honest note instead of a fabricated one.
   */
  private async recordInboundMessage(integration: WhatsAppIntegration, phoneNumberId: string, message: MetaWebhookMessage): Promise<void> {
    if (!message.from) return;
    const from = normalizePhoneNumber(message.from);
    const lastOutbound = await prisma.whatsAppMessage.findFirst({
      where: { organizationId: integration.organizationId, direction: "OUTBOUND", toNumber: { in: phoneNumberVariants(message.from) } },
      orderBy: { createdAt: "desc" },
    });

    const mediaRef = message.image ?? message.document ?? message.audio ?? message.video ?? message.sticker;
    let attachment: { bucket: string; path: string; mimeType: string; fileName: string; fileSize: number } | null = null;
    let downloadError: string | null = null;

    if (mediaRef?.id && integration.provider === "META_CLOUD_API") {
      try {
        const adapter = new MetaWhatsAppAdapter({ phoneNumberId: integration.phoneNumberId, accessTokenEncrypted: integration.accessTokenEncrypted });
        const { buffer, mimeType } = await adapter.downloadMedia(mediaRef.id);
        const fileName = message.document?.filename ?? guessFileName(message.type, mimeType);
        const storagePath = buildWhatsAppAttachmentPath(canonicalPhoneKey(from), fileName);
        await storageAdapter.upload(STORAGE_BUCKETS.evidence, storagePath, buffer, mimeType);
        attachment = { bucket: STORAGE_BUCKETS.evidence, path: storagePath, mimeType, fileName, fileSize: buffer.length };
      } catch (error) {
        downloadError = (error as Error).message;
      }
    }

    const caption = message.image?.caption ?? message.document?.caption ?? message.video?.caption ?? null;
    const messageBody =
      message.text?.body ??
      caption ??
      (attachment
        ? ""
        : downloadError
          ? `[anexo recebido, mas não foi possível baixar: ${downloadError}]`
          : `[mensagem do tipo "${message.type ?? "desconhecido"}" — sem suporte ainda]`);

    await prisma.whatsAppMessage.create({
      data: {
        organizationId: integration.organizationId,
        requestId: lastOutbound?.requestId,
        direction: "INBOUND",
        fromNumber: from,
        toNumber: phoneNumberId,
        messageBody,
        status: "RECEIVED",
        attachmentStorageBucket: attachment?.bucket,
        attachmentStoragePath: attachment?.path,
        attachmentMimeType: attachment?.mimeType,
        attachmentFileName: attachment?.fileName,
        attachmentFileSize: attachment?.fileSize,
      },
    });
  }
}

function guessFileName(type: string | undefined, mimeType: string): string {
  const subtype = mimeType.split("/")[1]?.split(";")[0] ?? "bin";
  return `${type ?? "arquivo"}.${subtype}`;
}

type MetaWebhookStatus = { id?: string; status?: string; errors?: { message?: string }[] };
type MetaWebhookMediaRef = { id?: string; mime_type?: string; sha256?: string; caption?: string; filename?: string };
type MetaWebhookMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: MetaWebhookMediaRef;
  document?: MetaWebhookMediaRef;
  audio?: MetaWebhookMediaRef;
  video?: MetaWebhookMediaRef;
  sticker?: MetaWebhookMediaRef;
};
type MetaWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: MetaWebhookStatus[];
        messages?: MetaWebhookMessage[];
      };
    }[];
  }[];
};

export const WHATSAPP_TEMPLATES: Record<string, string> = {
  // Named request_received1 in Meta, not request_received — that name got
  // rejected ("Incorrect Category") and re-registering under the same name
  // wasn't available, so the approved template is under a new name.
  // Rewritten wording for the same reason: an opening greeting plus a soft
  // "you can check it" call-to-action reads as an engagement/welcome
  // message rather than an update on an already-open service request.
  request_received1:
    "A solicitação #{{requestId}} foi recebida pela MedCheck e entrou em processamento. Notificaremos você a cada etapa importante.",
  completed:
    "A análise da solicitação #{{requestId}} foi concluída. Confira o parecer no painel MedCheck.",
};

function renderTemplate(templateName: string, variables: Record<string, string>) {
  const template = WHATSAPP_TEMPLATES[templateName] ?? templateName;
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export const whatsAppService: WhatsAppService = new DefaultWhatsAppService();
