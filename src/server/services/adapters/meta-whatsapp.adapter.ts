import { simulateLatency, randomInt } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

/**
 * Mocked Meta Cloud API adapter. To go live: call
 * `POST https://graph.facebook.com/v20.0/{phoneNumberId}/messages` with the
 * organization's access token (WHATSAPP_ACCESS_TOKEN) and phoneNumberId
 * (WHATSAPP_PHONE_NUMBER_ID), forwarding template name + component
 * variables per Meta's template message schema.
 */
export class MetaWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(
    to: string,
    templateName: string,
    _variables: Record<string, string>,
  ): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `wamid.mock.${randomInt(100000, 999999)}`, status: "SENT" };
  }

  async sendTextMessage(_to: string, _message: string): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: `wamid.mock.${randomInt(100000, 999999)}`, status: "SENT" };
  }
}
