"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { createUserSchema, updateNotificationPreferenceSchema, updateMyPhoneSchema } from "@/lib/validations/user";

export async function createOrganizationUser(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.manageOrganizationUsers(session.user.role) || !session.user.organizationId) {
    throw new Error("Você não tem permissão para gerenciar usuários da organização.");
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  if (!["CLIENT_ADMIN", "CLIENT_USER"].includes(data.role)) {
    return { error: "Papel inválido para usuários da organização." };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return { error: "Já existe um usuário com este e-mail." };

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: session.user.organizationId,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      role: data.role,
      passwordHash,
    },
  });

  await recordAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    newData: { email: user.email, role: user.role },
  });

  revalidatePath("/app/users");
  return { success: true };
}

export async function createAnyUser(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.manageInternalUsers(session.user.role)) {
    throw new Error("Sem permissão para gerenciar usuários.");
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  if (data.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { error: "Apenas um Super Administrador pode criar outro Super Administrador." };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return { error: "Já existe um usuário com este e-mail." };

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: data.organizationId || null,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      role: data.role,
      passwordHash,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    newData: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleAnyUserStatus(userId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageInternalUsers(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  await prisma.user.update({ where: { id: userId }, data: { status: nextStatus } });

  await recordAuditLog({
    userId: session.user.id,
    action: "USER_STATUS_CHANGED",
    entityType: "User",
    entityId: userId,
    previousData: { status: user.status },
    newData: { status: nextStatus },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleOrganizationUserStatus(userId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageOrganizationUsers(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== session.user.organizationId) throw new Error("Usuário não pertence à sua organização.");

  const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  await prisma.user.update({ where: { id: userId }, data: { status: nextStatus } });

  await recordAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "USER_STATUS_CHANGED",
    entityType: "User",
    entityId: userId,
    previousData: { status: user.status },
    newData: { status: nextStatus },
  });

  revalidatePath("/app/users");
  return { success: true };
}

/** Self-service — the number used for MedCheck's automatic WhatsApp notifications, editable by the user it belongs to (not just settable once by whoever created the account). */
export async function updateMyPhone(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");

  const parsed = updateMyPhoneSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Número inválido." };

  await prisma.user.update({ where: { id: session.user.id }, data: { phone: parsed.data.phone } });

  revalidatePath("/app/settings");
  return { success: true };
}

export async function updateNotificationPreference(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");

  const parsed = updateNotificationPreferenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };

  await prisma.notificationPreference.upsert({
    where: { organizationId_userId: { organizationId: session.user.organizationId!, userId: session.user.id } },
    create: { organizationId: session.user.organizationId!, userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/app/settings");
  return { success: true };
}
