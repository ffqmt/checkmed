"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { permissions } from "@/lib/rbac";

export async function updateExtractedData(requestId: string, updates: Record<string, string>) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Sem permissão para editar dados extraídos.");
  }

  const previous = await prisma.extractedData.findUnique({ where: { requestId } });
  if (!previous) throw new Error("Dados extraídos não encontrados.");

  const data: Record<string, string | Date | null> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (["certificateIssueDate", "absenceStartDate", "absenceEndDate"].includes(key)) {
      data[key] = value ? new Date(value) : null;
    } else {
      data[key] = value || null;
    }
  }

  await prisma.extractedData.update({ where: { requestId }, data });

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: requestId } });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId,
    action: "EXTRACTED_DATA_EDITED",
    entityType: "ExtractedData",
    previousData: JSON.parse(JSON.stringify(previous)),
    newData: updates,
  });
  await recordTimelineEvent({
    requestId,
    userId: session.user.id,
    eventType: "DATA_EXTRACTED",
    title: "Dados extraídos corrigidos manualmente",
    isClientVisible: false,
  });

  revalidatePath(`/ops/requests/${requestId}`);
  return { success: true };
}

export async function assignRequest(requestId: string, userId: string, role: "assignedToUserId" | "supervisorUserId") {
  const session = await auth();
  if (!session?.user || !permissions.assignAnalyst(session.user.role)) {
    throw new Error("Sem permissão para atribuir este caso.");
  }

  await prisma.medicalCertificateRequest.update({ where: { id: requestId }, data: { [role]: userId } });
  await recordTimelineEvent({
    requestId,
    userId: session.user.id,
    eventType: "STATUS_CHANGED",
    title: role === "assignedToUserId" ? "Caso atribuído a um analista" : "Caso atribuído a um supervisor",
    isClientVisible: false,
  });

  revalidatePath(`/ops/requests/${requestId}`);
  return { success: true };
}
