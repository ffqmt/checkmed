import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Asaas webhook receiver. Auth is a shared secret Asaas echoes back in the
 * `asaas-access-token` header (configured when the webhook is registered —
 * see createAsaasWebhook in the adapter, or set it up once by hand in the
 * Asaas dashboard) — not an HMAC signature like Meta's WhatsApp webhook.
 * ASAAS_WEBHOOK_TOKEN must match exactly what was configured on the Asaas
 * side; a mismatch or missing header is rejected outright.
 */
export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expectedToken) {
    const received = request.headers.get("asaas-access-token");
    if (received !== expectedToken) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
  }

  const payload = (await request.json()) as { event?: string; payment?: { id?: string; status?: string }; subscription?: { id?: string; status?: string } };

  try {
    if (payload.payment?.id) {
      const statusMap: Record<string, "PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "CANCELED"> = {
        PAYMENT_CREATED: "PENDING",
        PAYMENT_CONFIRMED: "CONFIRMED",
        PAYMENT_RECEIVED: "RECEIVED",
        PAYMENT_OVERDUE: "OVERDUE",
        PAYMENT_DELETED: "CANCELED",
      };
      const mapped = payload.event ? statusMap[payload.event] : undefined;
      if (mapped) {
        await prisma.invoice.updateMany({
          where: { asaasPaymentId: payload.payment.id },
          data: { status: mapped, paidAt: mapped === "RECEIVED" || mapped === "CONFIRMED" ? new Date() : undefined },
        });
      }
    }

    if (payload.subscription?.id && payload.event) {
      const subStatusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED"> = {
        SUBSCRIPTION_CREATED: "ACTIVE",
        SUBSCRIPTION_UPDATED: "ACTIVE",
        SUBSCRIPTION_INACTIVATED: "CANCELED",
        SUBSCRIPTION_DELETED: "CANCELED",
      };
      const mapped = subStatusMap[payload.event];
      if (mapped) {
        await prisma.subscription.updateMany({ where: { asaasSubscriptionId: payload.subscription.id }, data: { status: mapped } });
      }
    }
  } catch (error) {
    console.error("[webhooks/asaas] failed to process event", payload.event, error);
    // Still 200 — Asaas retries on non-2xx, and a transient DB error here
    // shouldn't cause repeated re-delivery storms for an event we may have
    // partially processed already.
  }

  return NextResponse.json({ ok: true });
}
