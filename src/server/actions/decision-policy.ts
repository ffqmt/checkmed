"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/rbac";
import { recordAuditLog } from "@/server/audit";

export async function updateDecisionPolicy(
  organizationId: string,
  data: {
    autoValidateMinScore: number;
    humanReviewMinScore: number;
    clinicContactMaxScore: number;
    supervisorReviewMaxScore: number;
    requireDoctorValidatedForAutoValidate: boolean;
  },
) {
  const session = await auth();
  if (!session?.user || !permissions.manageGlobalSettings(session.user.role)) {
    throw new Error("Sem permissão para configurar regras de decisão.");
  }

  if (!(data.supervisorReviewMaxScore < data.clinicContactMaxScore && data.clinicContactMaxScore <= data.humanReviewMinScore && data.humanReviewMinScore <= data.autoValidateMinScore)) {
    return { error: "Os limites precisam seguir a ordem: supervisor < contato com clínica ≤ revisão humana ≤ auto-validação." };
  }

  await prisma.organizationDecisionPolicy.upsert({
    where: { organizationId },
    create: { organizationId, ...data, updatedByUserId: session.user.id },
    update: { ...data, updatedByUserId: session.user.id },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "DECISION_POLICY_UPDATED",
    entityType: "OrganizationDecisionPolicy",
    newData: data,
  });

  revalidatePath("/admin/decision-policy");
  return { success: true };
}

export async function resetDecisionPolicy(organizationId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageGlobalSettings(session.user.role)) {
    throw new Error("Sem permissão para configurar regras de decisão.");
  }

  await prisma.organizationDecisionPolicy.deleteMany({ where: { organizationId } });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "DECISION_POLICY_RESET",
    entityType: "OrganizationDecisionPolicy",
  });

  revalidatePath("/admin/decision-policy");
  return { success: true };
}
