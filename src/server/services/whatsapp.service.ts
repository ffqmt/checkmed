import { prisma } from "@/lib/prisma";
import type { WhatsAppProvider } from "@prisma/client";
import { MetaWhatsAppAdapter } from "./adapters/meta-whatsapp.adapter";
import { TwilioWhatsAppAdapter } from "./adapters/twilio-whatsapp.adapter";
import { GenericWhatsAppAdapter } from "./adapters/generic-whatsapp.adapter";
import type { WhatsAppAdapter } from "./adapters/whatsapp-adapter.types";

function adapterFor(provider: WhatsAppProvider): WhatsAppAdapter {
  switch (provider) {
    case "META_CLOUD_API":
      return new MetaWhatsAppAdapter();
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
  handleIncomingWebhook(payload: unknown): Promise<void>;
  updateDeliveryStatus(payload: unknown): Promise<void>;
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
    const adapter = adapterFor(provider);

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
    const adapter = adapterFor(provider);

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

  async handleIncomingWebhook(payload: unknown): Promise<void> {
    const data = payload as {
      organizationId?: string;
      from?: string;
      to?: string;
      body?: string;
    };
    if (!data.organizationId || !data.from || !data.body) return;

    await prisma.whatsAppMessage.create({
      data: {
        organizationId: data.organizationId,
        direction: "INBOUND",
        fromNumber: data.from,
        toNumber: data.to ?? "medcheck-sandbox",
        messageBody: data.body,
        status: "RECEIVED",
      },
    });
  }

  async updateDeliveryStatus(payload: unknown): Promise<void> {
    const data = payload as { providerMessageId?: string; status?: string };
    if (!data.providerMessageId || !data.status) return;

    const statusMap: Record<string, "DELIVERED" | "READ" | "FAILED"> = {
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    };
    const mapped = statusMap[data.status.toLowerCase()];
    if (!mapped) return;

    await prisma.whatsAppMessage.updateMany({
      where: { providerMessageId: data.providerMessageId },
      data: {
        status: mapped,
        deliveredAt: mapped === "DELIVERED" ? new Date() : undefined,
        readAt: mapped === "READ" ? new Date() : undefined,
      },
    });
  }
}

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
