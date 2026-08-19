"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { canonicalPhoneKey, phoneNumberVariants } from "@/lib/phone";
import { whatsAppService, WHATSAPP_TEMPLATES } from "@/server/services/whatsapp.service";
import { isOutsideEngagementWindow } from "@/lib/whatsapp-errors";
import { storageAdapter, buildWhatsAppAttachmentPath, type SignedUploadTarget } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/certificate-request";

/** Shape a client passes back to sendMessageToContact/sendWhatsAppTextMessage once beginMessageAttachmentUpload's target has been uploaded to directly. */
export type MessageAttachmentInput = { storagePath: string; fileName: string; mimeType: string; fileSize: number };

async function requireInternalAccess() {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Sem permissão para ver mensagens.");
  }
  return session;
}

function formatPhoneForDisplay(canonicalKey: string): string {
  return `+${canonicalKey}`;
}

/** Best-effort identity for the external contact — never the org name alone when a clinic name is known, since the org isn't who's actually on the other end of the conversation. Shared between the contact list and the thread header/bubbles so they never disagree. */
function resolveContactLabel(params: { clinicName: string | null; orgName: string | null; canonicalKey: string }): string {
  return params.clinicName ?? params.orgName ?? formatPhoneForDisplay(params.canonicalKey);
}

export type MessageContact = {
  canonicalKey: string;
  label: string;
  context: string | null;
  previewText: string | null;
  previewAt: Date;
  unreadCount: number;
};

const PREVIEW_WINDOW = 800;

/**
 * Every conversation MedCheck has ever had, one entry per real-world
 * contact (phone number) regardless of which client organization or case
 * it started from — grouping happens in two passes because a contact can't
 * be silently dropped by a windowed query:
 *
 * Phase A (authoritative, never windowed) aggregates *distinct raw numbers*
 * — not full message rows — via groupBy, so the contact list and its
 * ordering are correct no matter how large the table grows.
 *
 * Phase B (cosmetic only, bounded to PREVIEW_WINDOW) fetches a recent slice
 * just to build preview text and a human label; a contact whose only
 * messages fall outside that window still appears (from phase A), just
 * without a preview — falls back to the phone number.
 *
 * Adequate at today's volume (a handful of real conversations, no index on
 * fromNumber/toNumber yet). Would need a persisted canonical-contact column
 * + a real index if message volume grows — not attempted here since that
 * touches the live send/webhook path.
 */
export async function getMessageContacts(): Promise<MessageContact[]> {
  await requireInternalAccess();

  const [outboundGroups, inboundGroups] = await Promise.all([
    prisma.whatsAppMessage.groupBy({ by: ["toNumber"], where: { direction: "OUTBOUND" }, _max: { createdAt: true } }),
    prisma.whatsAppMessage.groupBy({ by: ["fromNumber"], where: { direction: "INBOUND" }, _max: { createdAt: true } }),
  ]);

  const lastSeenByKey = new Map<string, Date>();
  const noteLastSeen = (rawNumber: string, at: Date | null) => {
    if (!at) return;
    const key = canonicalPhoneKey(rawNumber);
    const current = lastSeenByKey.get(key);
    if (!current || at > current) lastSeenByKey.set(key, at);
  };
  for (const g of outboundGroups) noteLastSeen(g.toNumber, g._max.createdAt);
  for (const g of inboundGroups) noteLastSeen(g.fromNumber, g._max.createdAt);

  const unreadGroups = await prisma.whatsAppMessage.groupBy({
    by: ["fromNumber"],
    where: { direction: "INBOUND", seenByAnalystAt: null },
    _count: { _all: true },
  });
  const unreadByKey = new Map<string, number>();
  for (const g of unreadGroups) {
    const key = canonicalPhoneKey(g.fromNumber);
    unreadByKey.set(key, (unreadByKey.get(key) ?? 0) + g._count._all);
  }

  const recent = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: PREVIEW_WINDOW,
    include: {
      organization: { select: { name: true } },
      request: { select: { employeeName: true, clinicVerification: { select: { informedClinicName: true, officialName: true } } } },
    },
  });

  const previewByKey = new Map<string, { text: string; org: string; clinic: string | null; employeeName: string | null }>();
  for (const m of recent) {
    const contactNumber = m.direction === "OUTBOUND" ? m.toNumber : m.fromNumber;
    const key = canonicalPhoneKey(contactNumber);
    if (previewByKey.has(key)) continue; // `recent` is already newest-first, so the first hit per key wins
    const clinic = m.request?.clinicVerification?.officialName ?? m.request?.clinicVerification?.informedClinicName ?? null;
    previewByKey.set(key, { text: m.messageBody, org: m.organization.name, clinic, employeeName: m.request?.employeeName ?? null });
  }

  return [...lastSeenByKey.entries()]
    .map(([canonicalKey, previewAt]) => {
      const preview = previewByKey.get(canonicalKey);
      return {
        canonicalKey,
        label: resolveContactLabel({ clinicName: preview?.clinic ?? null, orgName: preview?.org ?? null, canonicalKey }),
        context: preview?.employeeName ? `Sobre: ${preview.employeeName}` : null,
        previewText: preview?.text ?? null,
        previewAt,
        unreadCount: unreadByKey.get(canonicalKey) ?? 0,
      };
    })
    .sort((a, b) => b.previewAt.getTime() - a.previewAt.getTime());
}

/** Full chronological history with one contact, across every request/organization that ever messaged that number — the whole point of the inbox instead of the per-request panel. */
export async function getContactThread(canonicalKey: string) {
  await requireInternalAccess();
  const variants = phoneNumberVariants(canonicalKey);

  const messages = await prisma.whatsAppMessage.findMany({
    where: {
      OR: [
        { direction: "OUTBOUND", toNumber: { in: variants } },
        { direction: "INBOUND", fromNumber: { in: variants } },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      request: { select: { id: true, employeeName: true, clinicVerification: { select: { informedClinicName: true, officialName: true } } } },
      organization: { select: { id: true, name: true } },
      sentByUser: { select: { id: true, name: true } },
    },
  });

  // Opening the thread is what "reading" it means here — same as any
  // messenger. Fire-and-await but don't let it block the response shape;
  // idempotent on repeated polls once everything's already marked.
  await prisma.whatsAppMessage.updateMany({
    where: { direction: "INBOUND", fromNumber: { in: variants }, seenByAnalystAt: null },
    data: { seenByAnalystAt: new Date() },
  });

  // Signed URLs are short-lived by design — computed fresh on every read
  // rather than stored, so a link never outlives its intended window.
  const messagesWithAttachments = await Promise.all(
    messages.map(async (m) => ({
      ...m,
      attachmentUrl:
        m.attachmentStorageBucket && m.attachmentStoragePath
          ? await storageAdapter.getSignedUrl(m.attachmentStorageBucket, m.attachmentStoragePath, 600)
          : null,
    })),
  );

  const relatedRequestsMap = new Map<string, { id: string; employeeName: string }>();
  for (const m of messages) {
    if (m.request) relatedRequestsMap.set(m.request.id, { id: m.request.id, employeeName: m.request.employeeName });
  }

  const last = messages.at(-1);
  // The canonical key can be the shortened (no-extra-9) form, which isn't
  // necessarily safe to send *to*. Prefer the toNumber of the most recent
  // OUTBOUND message — Meta already accepted a send to that exact string
  // before — over an INBOUND fromNumber, which Meta has only ever reported
  // as a *sender*, never confirmed as a valid recipient.
  const messagesNewestFirst = [...messages].reverse();
  const lastOutbound = messagesNewestFirst.find((m) => m.direction === "OUTBOUND");
  const lastKnownNumber = lastOutbound?.toNumber ?? last?.fromNumber ?? null;

  const clinicName =
    messagesNewestFirst
      .map((m) => m.request?.clinicVerification?.officialName ?? m.request?.clinicVerification?.informedClinicName ?? null)
      .find((c) => c !== null) ?? null;
  const contactLabel = resolveContactLabel({ clinicName, orgName: last?.organization.name ?? null, canonicalKey });

  const lastInbound = messagesNewestFirst.find((m) => m.direction === "INBOUND");
  const lastInboundAt = lastInbound?.createdAt ?? null;

  return {
    messages: messagesWithAttachments,
    contactLabel,
    relatedRequests: [...relatedRequestsMap.values()],
    // Whoever we most recently talked to this contact as — no picker, just visible before hitting send.
    defaultOrganization: last ? last.organization : null,
    lastKnownNumber,
    // Meta only allows free-form text within 24h of the contact's last
    // inbound message. Outside that window a free-form send always fails
    // with a "re-engagement" error — surfaced here so the UI can offer the
    // template fallback before the analyst hits send, not just after.
    outsideEngagementWindow: isOutsideEngagementWindow(lastInboundAt),
    lastInboundAt,
  };
}

/** Restarts a conversation outside the 24h free-form window — the only kind of message Meta accepts at that point. Needs the named template already approved in Meta Business Manager (see WHATSAPP_TEMPLATES in whatsapp.service.ts); until then Meta rejects it with its own clear error. */
export async function sendTemplateToContact(organizationId: string, toNumber: string, templateName: string) {
  const session = await requireInternalAccess();
  if (!(templateName in WHATSAPP_TEMPLATES)) return { error: "Modelo desconhecido." };

  await whatsAppService.sendTemplateMessage(organizationId, toNumber, templateName, {}, undefined, session.user.id);

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WHATSAPP_MESSAGE_SENT",
    entityType: "WhatsAppMessage",
    newData: { toNumber, templateName },
  });

  revalidatePath("/ops/messages");
  return { success: true };
}

/** Total unread INBOUND messages across every contact — feeds the nav badge, polled independently of whichever thread (if any) is currently open. */
export async function getUnreadMessageCount(): Promise<number> {
  await requireInternalAccess();
  return prisma.whatsAppMessage.count({ where: { direction: "INBOUND", seenByAnalystAt: null } });
}

/** For the "nova conversa" dialog's organization picker — every org an analyst might send as, not scoped to any existing conversation. */
export async function listOrganizationsForCompose() {
  await requireInternalAccess();
  return prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export type BeginMessageAttachmentUploadResult = { error: string } | { uploadTarget: SignedUploadTarget; storagePath: string };

/** Same direct-to-storage pattern as evidence uploads — reuses the evidence-files bucket rather than provisioning a new one, keyed by contact instead of requestId since a WhatsApp attachment often isn't tied to any case. */
export async function beginMessageAttachmentUpload(
  toNumber: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
): Promise<BeginMessageAttachmentUploadResult> {
  await requireInternalAccess();

  if (!ACCEPTED_FILE_TYPES.includes(mimeType)) {
    return { error: "Formato não suportado. Envie PDF, JPG, JPEG ou PNG." };
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite permitido de 15MB." };
  }

  const storagePath = buildWhatsAppAttachmentPath(canonicalPhoneKey(toNumber), fileName);
  const uploadTarget = await storageAdapter.createSignedUploadUrl(STORAGE_BUCKETS.evidence, storagePath, 300);
  return { uploadTarget, storagePath };
}

/** Sent from the central inbox rather than a specific request's own panel — intentionally not tagged to a case (tagging still happens by replying from inside a request, as today). */
export async function sendMessageToContact(organizationId: string, toNumber: string, message: string, attachment?: MessageAttachmentInput) {
  const session = await requireInternalAccess();
  if (!toNumber || (!message.trim() && !attachment)) return { error: "Informe o número e uma mensagem ou anexo." };

  if (attachment) {
    const buffer = await storageAdapter.download(STORAGE_BUCKETS.evidence, attachment.storagePath);
    await whatsAppService.sendMediaMessage(
      organizationId,
      toNumber,
      { buffer, mimeType: attachment.mimeType, fileName: attachment.fileName, storageBucket: STORAGE_BUCKETS.evidence, storagePath: attachment.storagePath, fileSize: attachment.fileSize },
      message.trim() || undefined,
      undefined,
      session.user.id,
    );
  } else {
    await whatsAppService.sendTextMessage(organizationId, toNumber, message, undefined, session.user.id);
  }

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WHATSAPP_MESSAGE_SENT",
    entityType: "WhatsAppMessage",
    newData: { toNumber, hasAttachment: Boolean(attachment) },
  });

  revalidatePath("/ops/messages");
  return { success: true };
}
