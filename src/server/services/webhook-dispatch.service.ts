import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type WebhookEventType =
  | "request.received"
  | "request.processing_started"
  | "request.waiting_human_review"
  | "request.waiting_external_response"
  | "request.completed"
  | "request.inconsistent"
  | "request.contested";

/**
 * Fans an event out to every active WebhookEndpoint subscribed to it for
 * the organization, signing the payload with the endpoint's secret
 * (HMAC-SHA256, header `X-MedCheck-Signature`). Delivery is fire-and-forget
 * with a single attempt recorded — retry/backoff (via nextRetryAt) is the
 * natural extension point once this runs on a real queue.
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  eventType: WebhookEventType,
  payload: Record<string, Prisma.InputJsonValue | null>,
  requestId?: string,
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, status: "ACTIVE" },
  });

  const subscribed = endpoints.filter((e) => (e.eventsJson as string[]).includes(eventType));
  if (subscribed.length === 0) return;

  const body = { event: eventType, timestamp: new Date().toISOString(), data: payload };

  await Promise.all(
    subscribed.map(async (endpoint) => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookEndpointId: endpoint.id,
          requestId,
          eventType,
          payloadJson: body,
          status: "PENDING",
        },
      });

      try {
        const signature = crypto.createHmac("sha256", endpoint.secret).update(JSON.stringify(body)).digest("hex");
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-MedCheck-Signature": signature },
          body: JSON.stringify(body),
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
    }),
  );
}
