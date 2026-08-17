import { simulateLatency } from "../mock-utils";
import type { WhatsAppAdapter, WhatsAppSendResult } from "./whatsapp-adapter.types";

const NOTE = "Nenhum provedor real conectado — mensagem simulada, não foi enviada de fato.";

/**
 * Generic fallback adapter — covers Z-API and any other provider until a
 * dedicated adapter is written. Always reports SIMULATED, never a fabricated
 * "SENT" — safe default for local dev and for any organization without a
 * dedicated integration built yet.
 */
export class GenericWhatsAppAdapter implements WhatsAppAdapter {
  async sendTemplateMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }

  async sendTextMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }

  async sendMediaMessage(): Promise<WhatsAppSendResult> {
    await simulateLatency(200, 700);
    return { providerMessageId: null, status: "SIMULATED", errorMessage: NOTE };
  }
}
