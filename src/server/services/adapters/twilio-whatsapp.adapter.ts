import { simulateLatency } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

const NOTE = "Nenhum provedor real conectado — mensagem simulada, não foi enviada de fato.";

/**
 * No real HTTP call is made yet — to go live: use the Twilio Node SDK
 * (`client.messages.create`) with `whatsapp:+<number>` addressing and a
 * pre-approved content template SID for template sends, using the
 * organization's decrypted access token (see whatsapp-integration.ts).
 *
 * Until that call exists, this honestly reports SIMULATED regardless of
 * whether an access token has been configured for the organization.
 */
export class TwilioWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }

  async sendTextMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }
}
