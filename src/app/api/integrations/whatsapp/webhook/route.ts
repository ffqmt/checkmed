import { NextRequest, NextResponse } from "next/server";
import { whatsAppService } from "@/server/services/whatsapp.service";
import { forwardToEmissor } from "@/server/services/emissor-forward.service";
import { stripEmissorBoundMessages } from "@/lib/emissor-message-filter";

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

/**
 * POST — incoming messages and delivery-status callbacks from the WhatsApp
 * provider. Also relays a raw copy to emissor (sibling product reusing this
 * same number/App — see emissor-forward.service.ts) and strips
 * emissor-bound messages before our own processing, so a WhatsApp
 * verification code or "notas"/"status N" command doesn't show up as noise
 * in our own inbox.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  await forwardToEmissor(rawBody);

  const filteredPayload = stripEmissorBoundMessages(payload);
  await whatsAppService.processWebhookPayload(filteredPayload);

  return NextResponse.json({ received: true });
}
