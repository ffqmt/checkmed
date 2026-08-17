import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationPreference } from "@prisma/client";
import { whatsAppService, WHATSAPP_TEMPLATES } from "./whatsapp.service";

type NotificationEvent =
  | "REQUEST_RECEIVED"
  | "PROCESSING_STARTED"
  | "WAITING_EXTERNAL_RESPONSE"
  | "COMPLETED"
  | "INCONSISTENCY";

const EVENT_COPY: Record<NotificationEvent, { title: string; message: (requestId: string) => string }> = {
  REQUEST_RECEIVED: {
    title: "Solicitação recebida",
    message: (id) => `A solicitação #${id.slice(-8)} foi recebida e entrará em processamento.`,
  },
  PROCESSING_STARTED: {
    title: "Análise iniciada",
    message: (id) => `A solicitação #${id.slice(-8)} entrou em processamento automático.`,
  },
  WAITING_EXTERNAL_RESPONSE: {
    title: "Aguardando confirmação externa",
    message: (id) => `A solicitação #${id.slice(-8)} está aguardando confirmação de uma fonte externa.`,
  },
  COMPLETED: {
    title: "Análise concluída",
    message: (id) => `A solicitação #${id.slice(-8)} foi concluída. Confira o parecer no painel.`,
  },
  INCONSISTENCY: {
    title: "Revisão necessária",
    message: (id) => `A solicitação #${id.slice(-8)} apresentou indícios que requerem revisão.`,
  },
};

const EVENT_TO_PREFERENCE_FIELD: Record<NotificationEvent, string> = {
  REQUEST_RECEIVED: "notifyOnRequestReceived",
  PROCESSING_STARTED: "notifyOnProcessingStarted",
  WAITING_EXTERNAL_RESPONSE: "notifyOnWaitingExternalResponse",
  COMPLETED: "notifyOnCompleted",
  INCONSISTENCY: "notifyOnInconsistency",
};

// Only two approved WhatsApp templates exist today (request_received1,
// completed) — PROCESSING_STARTED and WAITING_EXTERNAL_RESPONSE deliberately
// have no entry, by choice (fewer WhatsApp touchpoints wanted), not because
// their templates are still pending. notify() already treats a missing
// mapping as "in-app only" for that event, so this alone is the whole fix.
const EVENT_TO_WHATSAPP_TEMPLATE: Partial<Record<NotificationEvent, keyof typeof WHATSAPP_TEMPLATES>> = {
  REQUEST_RECEIVED: "request_received1",
  COMPLETED: "completed",
};

export interface NotificationService {
  notify(params: {
    organizationId: string;
    requestId: string;
    userId?: string;
    event: NotificationEvent;
    toPhone?: string | null;
  }): Promise<void>;
}

/**
 * Dispatches in-app notifications (always) plus WhatsApp (when configured
 * and the organization/user preference allows it). Email dispatch follows
 * the same shape — add an EmailAdapter and a NotificationChannel.EMAIL
 * branch here when a provider (Resend/SendGrid/SES) is wired in.
 */
export class DefaultNotificationService implements NotificationService {
  async notify(params: {
    organizationId: string;
    requestId: string;
    userId?: string;
    event: NotificationEvent;
    toPhone?: string | null;
  }): Promise<void> {
    const copy = EVENT_COPY[params.event];

    const preference = await prisma.notificationPreference.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
      },
    });

    const field = EVENT_TO_PREFERENCE_FIELD[params.event] as keyof NotificationPreference | undefined;
    const allowed = !preference || !field || preference[field] !== false;
    if (!allowed) return;

    await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        requestId: params.requestId,
        channel: "IN_APP" as NotificationChannel,
        title: copy.title,
        message: copy.message(params.requestId),
        status: "SENT",
      },
    });

    const templateName = EVENT_TO_WHATSAPP_TEMPLATE[params.event];
    const whatsappAllowed = !preference || preference.notifyViaWhatsApp !== false;
    if (templateName && params.toPhone && whatsappAllowed) {
      await whatsAppService.sendTemplateMessage(
        params.organizationId,
        params.toPhone,
        templateName,
        { requestId: params.requestId.slice(-8) },
        params.requestId,
      );
    }
  }
}

export const notificationService: NotificationService = new DefaultNotificationService();
