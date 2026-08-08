"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { assignLeastBusyUser } from "@/server/assignment";
import { dispatchWebhookEvent } from "@/server/services/webhook-dispatch.service";
import { createDisputeSchema, resolveDisputeSchema } from "@/lib/validations/dispute";
import { permissions } from "@/lib/rbac";

export async function createDispute(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.openDispute(session.user.role)) {
    throw new Error("Você não tem permissão para abrir uma contestação.");
  }

  const parsed = createDisputeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: data.requestId } });
  if (request.organizationId !== session.user.organizationId) {
    throw new Error("Solicitação não pertence à sua organização.");
  }

  const assignedTo = await assignLeastBusyUser("INTERNAL_SUPERVISOR");

  const dispute = await prisma.dispute.create({
    data: {
      requestId: data.requestId,
      openedByUserId: session.user.id,
      reason: data.reason,
      description: data.description,
      assignedToUserId: assignedTo ?? undefined,
    },
  });

  await prisma.medicalCertificateRequest.update({ where: { id: data.requestId }, data: { status: "CONTESTED" } });

  await recordTimelineEvent({
    requestId: data.requestId,
    userId: session.user.id,
    eventType: "REQUEST_CONTESTED",
    title: "Contestação aberta pelo cliente",
    description: data.reason,
    isClientVisible: true,
  });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId: data.requestId,
    action: "DISPUTE_OPENED",
    entityType: "Dispute",
    entityId: dispute.id,
    newData: { reason: data.reason },
  });
  await dispatchWebhookEvent(request.organizationId, "request.contested", { requestId: data.requestId, reason: data.reason }, data.requestId);

  revalidatePath(`/app/requests/${data.requestId}`);
  revalidatePath("/app/disputes");
  return { success: true };
}

export async function resolveDispute(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.approveSupervisorReview(session.user.role)) {
    throw new Error("Você não tem permissão para tratar esta contestação.");
  }

  const parsed = resolveDisputeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const dispute = await prisma.dispute.update({
    where: { id: data.disputeId },
    data: {
      status: data.status,
      resolution: data.resolution,
      resolvedAt: ["RESOLVED", "REJECTED", "CANCELLED"].includes(data.status) ? new Date() : undefined,
    },
  });

  const shouldReopen = data.status === "RESOLVED" || data.status === "WAITING_ADDITIONAL_INFORMATION";
  await prisma.medicalCertificateRequest.update({
    where: { id: dispute.requestId },
    data: { status: shouldReopen ? "REOPENED" : "CONTESTED" },
  });

  await recordTimelineEvent({
    requestId: dispute.requestId,
    userId: session.user.id,
    eventType: shouldReopen ? "REQUEST_REOPENED" : "STATUS_CHANGED",
    title: `Contestação atualizada: ${data.status}`,
    description: data.resolution,
    isClientVisible: true,
  });
  await recordAuditLog({
    userId: session.user.id,
    requestId: dispute.requestId,
    action: "DISPUTE_UPDATED",
    entityType: "Dispute",
    entityId: dispute.id,
    newData: { status: data.status },
  });

  revalidatePath(`/ops/requests/${dispute.requestId}`);
  revalidatePath(`/app/requests/${dispute.requestId}`);
  return { success: true };
}
