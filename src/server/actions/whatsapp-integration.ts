"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";
import type { WhatsAppProvider } from "@prisma/client";

export async function upsertWhatsAppIntegration(organizationId: string, provider: WhatsAppProvider, phoneNumberId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageWhatsAppIntegration(session.user.role)) {
    throw new Error("Sem permissão para configurar integrações.");
  }

  await prisma.whatsAppIntegration.upsert({
    where: { organizationId },
    create: { organizationId, provider, phoneNumberId, status: "ACTIVE" },
    update: { provider, phoneNumberId, status: "ACTIVE" },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WHATSAPP_INTEGRATION_UPDATED",
    entityType: "WhatsAppIntegration",
    newData: { provider, phoneNumberId },
  });

  revalidatePath("/admin/whatsapp");
  return { success: true };
}
