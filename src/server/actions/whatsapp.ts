"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { whatsAppService } from "@/server/services/whatsapp.service";
import { storageAdapter } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { permissions } from "@/lib/rbac";
import type { MessageAttachmentInput } from "@/server/actions/messages-inbox";

export async function sendWhatsAppTextMessage(requestId: string, toNumber: string, message: string, attachment?: MessageAttachmentInput) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Sem permissão para enviar mensagens.");
  }
  if (!toNumber || (!message.trim() && !attachment)) return { error: "Informe o número e uma mensagem ou anexo." };

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: requestId } });

  if (attachment) {
    const buffer = await storageAdapter.download(STORAGE_BUCKETS.evidence, attachment.storagePath);
    await whatsAppService.sendMediaMessage(
      request.organizationId,
      toNumber,
      { buffer, mimeType: attachment.mimeType, fileName: attachment.fileName, storageBucket: STORAGE_BUCKETS.evidence, storagePath: attachment.storagePath, fileSize: attachment.fileSize },
      message.trim() || undefined,
      requestId,
      session.user.id,
    );
  } else {
    await whatsAppService.sendTextMessage(request.organizationId, toNumber, message, requestId, session.user.id);
  }
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

/**
 * Delivery-status updates and inbound replies arrive via webhook — a
 * request completely separate from whichever browser tab has the page
 * open — so nothing pushes those changes to an already-rendered page.
 * WhatsAppPanel polls this on an interval instead of the heavier
 * router.refresh() (which would re-run the whole page, not just the
 * message list).
 */
export async function getWhatsAppMessages(requestId: string) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Sem permissão para ver mensagens.");
  }
  const messages = await prisma.whatsAppMessage.findMany({
    where: { requestId },
    orderBy: { createdAt: "asc" },
    include: { sentByUser: { select: { id: true, name: true } } },
  });
  // Signed URLs are short-lived by design — computed fresh on every read rather than stored.
  return Promise.all(
    messages.map(async (m) => ({
      ...m,
      attachmentUrl:
        m.attachmentStorageBucket && m.attachmentStoragePath
          ? await storageAdapter.getSignedUrl(m.attachmentStorageBucket, m.attachmentStoragePath, 600)
          : null,
    })),
  );
}
