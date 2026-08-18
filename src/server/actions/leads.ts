"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/rbac";
import { submitLeadSchema, updateLeadStatusSchema } from "@/lib/validations/lead";

/** Public — called from the unauthenticated institutional page, no session required. */
export async function submitLead(input: unknown) {
  const parsed = submitLeadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  await prisma.lead.create({ data: parsed.data });
  return { success: true };
}

async function requireLeadAccess() {
  const session = await auth();
  if (!session?.user || !permissions.manageLeads(session.user.role)) {
    throw new Error("Sem permissão para ver leads.");
  }
  return session;
}

export async function getLeads() {
  await requireLeadAccess();
  return prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateLeadStatus(input: unknown) {
  await requireLeadAccess();
  const parsed = updateLeadStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };

  await prisma.lead.update({ where: { id: parsed.data.leadId }, data: { status: parsed.data.status } });
  revalidatePath("/admin/leads");
  return { success: true };
}
