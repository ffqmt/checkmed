import { simulateLatency } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

const NOTE = "Nenhum provedor real conectado — mensagem simulada, não foi enviada de fato.";

/**
 * No real HTTP call is made yet — to go live: call
 * `POST https://graph.facebook.com/v20.0/{phoneNumberId}/messages` with the
 * organization's decrypted access token (see server/actions/whatsapp-integration.ts
 * / lib/secret-encryption.ts) and phoneNumberId, forwarding template name +
 * component variables per Meta's template message schema.
 *
 * Until that call exists, this honestly reports SIMULATED (not a fabricated
 * "SENT") regardless of whether an access token has been configured for the
 * organization — a real token unlocks nothing here yet, on its own.
 */
export class MetaWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }

  async sendTextMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }
}
