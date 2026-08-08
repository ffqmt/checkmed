import { simulateLatency, randomInt } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

/**
 * Generic fallback adapter — covers Z-API and any other provider until a
 * dedicated adapter is written. Always mocked; safe default for local dev.
 */
export class GenericWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `generic.mock.${randomInt(100000, 999999)}`, status: "SENT" };
  }

  async sendTextMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `generic.mock.${randomInt(100000, 999999)}`, status: "SENT" };
  }
}
