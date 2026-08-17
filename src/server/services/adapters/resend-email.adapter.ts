import type { EmailAdapter, EmailSendResult } from "./email-adapter.types";

const RESEND_API_URL = "https://api.resend.com/emails";
const NOT_CONFIGURED_NOTE = "Nenhum provedor de e-mail real conectado — mensagem simulada, não foi enviada de fato.";

type ResendSuccess = { id: string };
type ResendError = { name: string; message: string };

/**
 * Real Resend API call — POST /emails. Requires RESEND_API_KEY and
 * EMAIL_FROM_ADDRESS (a verified sender on a domain with SPF/DKIM records
 * added, e.g. medcheck@francotech.com.br); without either, this honestly
 * reports SIMULATED rather than fabricating a SENT status — same rule
 * MetaWhatsAppAdapter follows for an unconfigured integration.
 */
export class ResendEmailAdapter implements EmailAdapter {
  async sendEmail(to: string, subject: string, html: string): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM_ADDRESS;
    if (!apiKey || !from) {
      return { providerMessageId: null, status: "SIMULATED", errorMessage: NOT_CONFIGURED_NOTE };
    }

    let response: Response;
    try {
      response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      return { providerMessageId: null, status: "FAILED", errorMessage: `Não foi possível conectar ao Resend: ${(error as Error).message}` };
    }

    const json = (await response.json()) as ResendSuccess | ResendError;
    if (!response.ok || !("id" in json)) {
      const message = "message" in json ? json.message : `Resend retornou HTTP ${response.status}.`;
      return { providerMessageId: null, status: "FAILED", errorMessage: message };
    }

    return { providerMessageId: json.id, status: "SENT" };
  }
}

export const emailAdapter: EmailAdapter = new ResendEmailAdapter();
