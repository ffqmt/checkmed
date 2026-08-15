import { prisma } from "@/lib/prisma";
import type { WhatsAppProvider, WhatsAppMessageStatus } from "@prisma/client";
import { MetaWhatsAppAdapter } from "./adapters/meta-whatsapp.adapter";
import { TwilioWhatsAppAdapter } from "./adapters/twilio-whatsapp.adapter";
import { GenericWhatsAppAdapter } from "./adapters/generic-whatsapp.adapter";
import type { WhatsAppAdapter } from "./adapters/whatsapp-adapter.types";

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

export interface WhatsAppService {
  sendTemplateMessage(
    organizationId: string,
    to: string,
    templateName: string,
    variables: Record<string, string>,
    requestId?: string,
  ): Promise<void>;
  sendTextMessage(organizationId: string, to: string, message: string, requestId?: string): Promise<void>;
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
        direction: "OUTBOUND",
        fromNumber: integration?.phoneNumberId ?? "medcheck-sandbox",
        toNumber: to,
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

  async sendTextMessage(organizationId: string, to: string, message: string, requestId?: string): Promise<void> {
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
    const provider = integration?.provider ?? "OTHER";
    const adapter = adapterFor(provider, integration);

    const record = await prisma.whatsAppMessage.create({
      data: {
        organizationId,
        requestId,
        direction: "OUTBOUND",
        fromNumber: integration?.phoneNumberId ?? "medcheck-sandbox",
        toNumber: to,
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
          await this.recordInboundMessage(integration.organizationId, phoneNumberId, message);
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

  private async recordInboundMessage(organizationId: string, phoneNumberId: string, message: MetaWebhookMessage): Promise<void> {
    if (!message.from) return;
    await prisma.whatsAppMessage.create({
      data: {
        organizationId,
        direction: "INBOUND",
        fromNumber: message.from,
        toNumber: phoneNumberId,
        messageBody: message.text?.body ?? `[mensagem do tipo "${message.type ?? "desconhecido"}" — sem suporte a texto ainda]`,
        status: "RECEIVED",
      },
    });
  }
}

type MetaWebhookStatus = { id?: string; status?: string; errors?: { message?: string }[] };
type MetaWebhookMessage = { from?: string; type?: string; text?: { body?: string } };
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
  request_received:
    "Olá, sua solicitação de validação #{{requestId}} foi recebida e está em processamento. Você pode acompanhar o status no painel MedCheck.",
  processing_started:
    "Sua solicitação #{{requestId}} entrou em análise automática. Notificaremos você a cada etapa importante.",
  missing_information:
    "Sua solicitação #{{requestId}} precisa de informações adicionais. Acesse o painel MedCheck para mais detalhes.",
  clinic_contacted:
    "Estamos em contato com a instituição emissora para confirmar dados da solicitação #{{requestId}}.",
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
