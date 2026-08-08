"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { permissions } from "@/lib/rbac";

export async function createWebhookEndpoint(organizationId: string, url: string, events: string[]) {
  const session = await auth();
  if (!session?.user || !permissions.manageApiKeysAndWebhooks(session.user.role)) {
    throw new Error("Sem permissão para criar webhooks.");
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) return { error: "Informe uma URL válida." };

  const secret = crypto.randomBytes(20).toString("hex");
  const endpoint = await prisma.webhookEndpoint.create({
    data: { organizationId, url, secret, eventsJson: events },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "WEBHOOK_CREATED",
    entityType: "WebhookEndpoint",
    entityId: endpoint.id,
    newData: { url, events },
  });

  revalidatePath("/admin/webhooks");
  return { success: true };
}

export async function deleteWebhookEndpoint(endpointId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageApiKeysAndWebhooks(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const endpoint = await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { status: "INACTIVE" } });

  await recordAuditLog({
    organizationId: endpoint.organizationId,
    userId: session.user.id,
    action: "WEBHOOK_DEACTIVATED",
    entityType: "WebhookEndpoint",
    entityId: endpointId,
  });

  revalidatePath("/admin/webhooks");
  return { success: true };
}

export async function sendTestWebhook(endpointId: string) {
  const session = await auth();
  if (!session?.user || !permissions.manageApiKeysAndWebhooks(session.user.role)) {
    throw new Error("Sem permissão.");
  }

  const endpoint = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
  const payload = { event: "webhook.test", timestamp: new Date().toISOString() };

  const delivery = await prisma.webhookDelivery.create({
    data: { webhookEndpointId: endpoint.id, eventType: "webhook.test", payloadJson: payload, status: "PENDING" },
  });

  try {
    const signature = crypto.createHmac("sha256", endpoint.secret).update(JSON.stringify(payload)).digest("hex");
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-MedCheck-Signature": signature },
      body: JSON.stringify(payload),
    });
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: res.ok ? "SUCCESS" : "FAILED", responseStatus: res.status, attemptCount: 1 },
    });
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", responseBody: (error as Error).message, attemptCount: 1 },
    });
  }

  revalidatePath("/admin/webhooks");
  return { success: true };
}
