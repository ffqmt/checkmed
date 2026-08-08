import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";
import { dispatchWebhookEvent } from "@/server/services/webhook-dispatch.service";

/** POST /api/v1/webhooks/test — fires a webhook.test event to every active endpoint subscribed to it for the authenticated organization. */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    await dispatchWebhookEvent(organizationId, "request.received", { test: true, message: "Evento de teste do MedCheck" });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
