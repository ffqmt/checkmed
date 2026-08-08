import { simulateLatency, randomInt } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

/**
 * Mocked Twilio adapter. To go live: use the Twilio Node SDK
 * (`client.messages.create`) with `whatsapp:+<number>` addressing and a
 * pre-approved content template SID for template sends.
 */
export class TwilioWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `SM${randomInt(10 ** 15, 10 ** 16 - 1)}`, status: "SENT" };
  }

  async sendTextMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `SM${randomInt(10 ** 15, 10 ** 16 - 1)}`, status: "SENT" };
  }
}
