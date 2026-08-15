"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import { encryptSecret } from "@/lib/secret-encryption";
import type { WhatsAppProvider } from "@prisma/client";

/**
 * Status only ever claims ACTIVE when there's actually a phone number *and*
 * an access token on file — previously this was hardcoded to "ACTIVE" on
 * every save, including saves with no token at all (the form didn't even
 * have a field for one). No real message send happens yet regardless (see
 * whatsapp.service.ts — every adapter reports SIMULATED), so this only
 * reflects "configured", not "verified working".
 */
export async function upsertWhatsAppIntegration(
  organizationId: string,
  provider: WhatsAppProvider,
  phoneNumberId: string,
  accessToken?: string,
) {
  const session = await auth();
  if (!session?.user || !permissions.manageWhatsAppIntegration(session.user.role)) {
    throw new Error("Sem permissão para configurar integrações.");
  }

  const existing = await prisma.whatsAppIntegration.findUnique({ where: { organizationId } });
  const accessTokenEncrypted = accessToken ? encryptSecret(accessToken) : existing?.accessTokenEncrypted;
  const status = phoneNumberId && accessTokenEncrypted ? "ACTIVE" : "PENDING_SETUP";

  await prisma.whatsAppIntegration.upsert({
    where: { organizationId },
    create: { organizationId, provider, phoneNumberId, accessTokenEncrypted, status },
    update: { provider, phoneNumberId, accessTokenEncrypted, status },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WHATSAPP_INTEGRATION_UPDATED",
    entityType: "WhatsAppIntegration",
    newData: { provider, phoneNumberId, tokenUpdated: Boolean(accessToken) },
  });

  revalidatePath("/admin/whatsapp");
  return { success: true };
}
