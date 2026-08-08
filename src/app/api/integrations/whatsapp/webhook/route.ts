import { NextRequest, NextResponse } from "next/server";
import { whatsAppService } from "@/server/services/whatsapp.service";

/**
 * GET — Meta's webhook verification handshake:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

/** POST — incoming messages and delivery-status callbacks from the WhatsApp provider. */
export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (payload?.status) {
    await whatsAppService.updateDeliveryStatus(payload);
  } else {
    await whatsAppService.handleIncomingWebhook(payload);
  }

  return NextResponse.json({ received: true });
}
