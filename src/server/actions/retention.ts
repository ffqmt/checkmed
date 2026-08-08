"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";

export async function updateRetentionPolicy(
  organizationId: string,
  retentionDays: number,
  autoAnonymize: boolean,
  autoDeleteFiles: boolean,
) {
  const session = await auth();
  if (!session?.user || !permissions.manageGlobalSettings(session.user.role)) {
    throw new Error("Sem permissão para alterar políticas de retenção.");
  }

  await prisma.dataRetentionPolicy.upsert({
    where: { organizationId },
    create: { organizationId, retentionDays, autoAnonymize, autoDeleteFiles },
    update: { retentionDays, autoAnonymize, autoDeleteFiles },
  });
  await prisma.organization.update({ where: { id: organizationId }, data: { dataRetentionDays: retentionDays } });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "RETENTION_POLICY_UPDATED",
    entityType: "DataRetentionPolicy",
    newData: { retentionDays, autoAnonymize, autoDeleteFiles },
  });

  revalidatePath("/admin/retention");
  return { success: true };
}
