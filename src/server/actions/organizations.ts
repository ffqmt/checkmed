"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { createOrganizationSchema } from "@/lib/validations/organization";

export async function createOrganization(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.manageOrganizations(session.user.role)) {
    throw new Error("Sem permissão para criar organizações.");
  }

  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const existing = await prisma.organization.findUnique({ where: { cnpj: data.cnpj } });
  if (existing) return { error: "Já existe uma organização com este CNPJ." };

  const org = await prisma.organization.create({
    data: {
      ...data,
      dataRetentionPolicy: { create: { retentionDays: data.dataRetentionDays } },
    },
  });

  await recordAuditLog({
    organizationId: org.id,
    userId: session.user.id,
    action: "ORGANIZATION_CREATED",
    entityType: "Organization",
    entityId: org.id,
    newData: { name: org.name, cnpj: org.cnpj },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function updateOrganizationStatus(organizationId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TRIAL") {
  const session = await auth();
  if (!session?.user || !permissions.manageOrganizations(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const previous = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  await prisma.organization.update({ where: { id: organizationId }, data: { status } });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "ORGANIZATION_STATUS_CHANGED",
    entityType: "Organization",
    entityId: organizationId,
    previousData: { status: previous.status },
    newData: { status },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}
