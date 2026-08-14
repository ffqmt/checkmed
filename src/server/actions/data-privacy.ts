"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { createDataPrivacyRequestSchema, updateDataPrivacyRequestSchema } from "@/lib/validations/data-privacy";
import { findMatchingRequests, anonymizeRequests, deleteRequestFiles, exportRequestsData } from "@/server/services/data-privacy.service";

export async function createDataPrivacyRequest(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.fileDataPrivacyRequest(session.user.role)) {
    throw new Error("Você não tem permissão para registrar solicitações de privacidade.");
  }
  if (!session.user.organizationId) throw new Error("Usuário sem organização associada.");

  const parsed = createDataPrivacyRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const created = await prisma.dataPrivacyRequest.create({
    data: {
      organizationId: session.user.organizationId,
      requestedByUserId: session.user.id,
      requestType: data.requestType,
      subjectName: data.subjectName,
      subjectDocumentMasked: data.subjectDocumentMasked,
      notes: data.notes,
    },
  });

  await recordAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "DATA_PRIVACY_REQUEST_CREATED",
    entityType: "DataPrivacyRequest",
    entityId: created.id,
    newData: { requestType: data.requestType },
  });

  revalidatePath("/app/settings");
  revalidatePath("/admin/data-privacy");
  return { success: true };
}

/** Real fulfillment for ANONYMIZATION/DELETION: finds the subject's requests (name + masked document match) in their own organization and runs the same anonymize/delete-files operations the retention cron uses — not a status toggle. */
export async function fulfillDataPrivacyRequest(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.fulfillDataPrivacyRequest(session.user.role)) {
    throw new Error("Você não tem permissão para executar solicitações de privacidade.");
  }

  const dpr = await prisma.dataPrivacyRequest.findUniqueOrThrow({ where: { id } });
  if (dpr.status === "COMPLETED") return { error: "Esta solicitação já foi concluída." };

  const matches = await findMatchingRequests(dpr.organizationId, dpr.subjectName, dpr.subjectDocumentMasked);
  const requestIds = matches.map((m) => m.id);

  let affected = 0;
  if (requestIds.length > 0) {
    if (dpr.requestType === "ANONYMIZATION" || dpr.requestType === "DELETION") {
      affected += await anonymizeRequests(dpr.organizationId, requestIds, "DATA_PRIVACY_REQUEST_FULFILLED");
    }
    if (dpr.requestType === "DELETION") {
      affected += await deleteRequestFiles(dpr.organizationId, requestIds, "DATA_PRIVACY_REQUEST_FULFILLED");
    }
  }

  await prisma.dataPrivacyRequest.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      notes: [dpr.notes, `Executado automaticamente: ${matches.length} solicitação(ões) de certificado encontrada(s) e processada(s).`]
        .filter(Boolean)
        .join(" — "),
    },
  });

  await recordAuditLog({
    organizationId: dpr.organizationId,
    userId: session.user.id,
    action: "DATA_PRIVACY_REQUEST_FULFILLED",
    entityType: "DataPrivacyRequest",
    entityId: id,
    newData: { matchedRequests: requestIds.length, requestType: dpr.requestType },
  });

  revalidatePath("/admin/data-privacy");
  return { success: true, matchedRequests: requestIds.length };
}

/** ACCESS/EXPORT/CORRECTION need a human decision (compiling data, correcting a specific field) — this just records the outcome the admin reached, no automated data mutation. */
export async function updateDataPrivacyRequestStatus(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.fulfillDataPrivacyRequest(session.user.role)) {
    throw new Error("Você não tem permissão para atualizar solicitações de privacidade.");
  }

  const parsed = updateDataPrivacyRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const dpr = await prisma.dataPrivacyRequest.update({
    where: { id: data.id },
    data: {
      status: data.status,
      notes: data.notes,
      completedAt: data.status === "COMPLETED" || data.status === "REJECTED" ? new Date() : null,
    },
  });

  await recordAuditLog({
    organizationId: dpr.organizationId,
    userId: session.user.id,
    action: "DATA_PRIVACY_REQUEST_STATUS_CHANGED",
    entityType: "DataPrivacyRequest",
    entityId: dpr.id,
    newData: { status: data.status },
  });

  revalidatePath("/admin/data-privacy");
  return { success: true };
}

/** Real JSON export of everything on file for the matched requests — the actual substance of an access/portability request. */
export async function exportDataPrivacyRequestData(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.fulfillDataPrivacyRequest(session.user.role)) {
    throw new Error("Você não tem permissão para exportar dados.");
  }

  const dpr = await prisma.dataPrivacyRequest.findUniqueOrThrow({ where: { id } });
  const matches = await findMatchingRequests(dpr.organizationId, dpr.subjectName, dpr.subjectDocumentMasked);
  const data = await exportRequestsData(matches.map((m) => m.id));

  await recordAuditLog({
    organizationId: dpr.organizationId,
    userId: session.user.id,
    action: "DATA_PRIVACY_REQUEST_EXPORTED",
    entityType: "DataPrivacyRequest",
    entityId: id,
    newData: { matchedRequests: matches.length },
  });

  return JSON.parse(JSON.stringify(data));
}
