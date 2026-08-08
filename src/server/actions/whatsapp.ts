"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { whatsAppService } from "@/server/services/whatsapp.service";
import { permissions } from "@/lib/rbac";

export async function sendWhatsAppTextMessage(requestId: string, toNumber: string, message: string) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Sem permissão para enviar mensagens.");
  }
  if (!toNumber || !message.trim()) return { error: "Informe o número e a mensagem." };

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: requestId } });

  await whatsAppService.sendTextMessage(request.organizationId, toNumber, message, requestId);
  await recordTimelineEvent({
    requestId,
    userId: session.user.id,
    eventType: "WHATSAPP_MESSAGE_SENT",
    title: "Mensagem de WhatsApp enviada",
    isClientVisible: false,
  });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId,
    action: "WHATSAPP_MESSAGE_SENT",
    entityType: "WhatsAppMessage",
    newData: { toNumber },
  });

  revalidatePath(`/ops/requests/${requestId}`);
  return { success: true };
}
