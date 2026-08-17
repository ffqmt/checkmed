"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { canonicalPhoneKey, phoneNumberVariants } from "@/lib/phone";
import { whatsAppService } from "@/server/services/whatsapp.service";

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

export type MessageContact = {
  canonicalKey: string;
  label: string;
  context: string | null;
  previewText: string | null;
  previewAt: Date;
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
        label: preview?.clinic ?? preview?.org ?? formatPhoneForDisplay(canonicalKey),
        context: preview?.employeeName ? `Sobre: ${preview.employeeName}` : null,
        previewText: preview?.text ?? null,
        previewAt,
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
      request: { select: { id: true, employeeName: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  const relatedRequestsMap = new Map<string, { id: string; employeeName: string }>();
  for (const m of messages) {
    if (m.request) relatedRequestsMap.set(m.request.id, m.request);
  }

  const last = messages.at(-1);
  // The canonical key can be the shortened (no-extra-9) form, which isn't
  // necessarily safe to send *to*. Prefer the toNumber of the most recent
  // OUTBOUND message — Meta already accepted a send to that exact string
  // before — over an INBOUND fromNumber, which Meta has only ever reported
  // as a *sender*, never confirmed as a valid recipient.
  const lastOutbound = [...messages].reverse().find((m) => m.direction === "OUTBOUND");
  const lastKnownNumber = lastOutbound?.toNumber ?? last?.fromNumber ?? null;

  return {
    messages,
    relatedRequests: [...relatedRequestsMap.values()],
    // Whoever we most recently talked to this contact as — no picker, just visible before hitting send.
    defaultOrganization: last ? last.organization : null,
    lastKnownNumber,
  };
}

/** Sent from the central inbox rather than a specific request's own panel — intentionally not tagged to a case (tagging still happens by replying from inside a request, as today). */
export async function sendMessageToContact(organizationId: string, toNumber: string, message: string) {
  const session = await requireInternalAccess();
  if (!toNumber || !message.trim()) return { error: "Informe o número e a mensagem." };

  await whatsAppService.sendTextMessage(organizationId, toNumber, message);

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WHATSAPP_MESSAGE_SENT",
    entityType: "WhatsAppMessage",
    newData: { toNumber },
  });

  revalidatePath("/ops/messages");
  return { success: true };
}
