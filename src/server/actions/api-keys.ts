"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";

function generateApiKey() {
  const raw = `mck_${crypto.randomBytes(24).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash, prefix: raw.slice(0, 12) };
}

export async function createApiKey(organizationId: string, name: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageApiKeysAndWebhooks(session.user.role)) {
    throw new Error("Sem permissão para gerar API keys.");
  }
  if (!name.trim()) return { error: "Informe um nome para identificar a chave." };

  const { raw, hash, prefix } = generateApiKey();

  await prisma.apiKey.create({
    data: { organizationId, name, keyHash: hash, keyPrefix: prefix },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "API_KEY_CREATED",
    entityType: "ApiKey",
    newData: { name, prefix },
  });

  revalidatePath("/admin/api-keys");
  return { success: true, rawKey: raw };
}

export async function revokeApiKey(apiKeyId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageApiKeysAndWebhooks(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const key = await prisma.apiKey.update({ where: { id: apiKeyId }, data: { status: "REVOKED" } });

  await recordAuditLog({
    organizationId: key.organizationId,
    userId: session.user.id,
    action: "API_KEY_REVOKED",
    entityType: "ApiKey",
    entityId: apiKeyId,
  });

  revalidatePath("/admin/api-keys");
  return { success: true };
}
