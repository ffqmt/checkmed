import crypto from "crypto";

/**
 * Encaminha uma cópia do payload bruto do webhook da Meta pro emissor
 * (produto irmão que reusa o mesmo número/App WhatsApp — Meta só permite 1
 * webhook URL por App, e essa URL já é do MedCheck). O MedCheck não decide
 * relevância a fundo (não sabe nada sobre clientes/empresas do emissor):
 * manda uma cópia de tudo, sempre; quem filtra de verdade é o emissor do
 * outro lado (este arquivo só evita duplicar RUÍDO no inbox do MedCheck,
 * ver emissor-message-filter.ts).
 *
 * Contrato desta função: NUNCA lança/rejeita, mesmo se a rede cair ou o
 * emissor responder erro — encaminhamento é aditivo e best-effort, nunca
 * pode afetar a resposta do MedCheck pra Meta.
 */
export async function forwardToEmissor(rawBody: string): Promise<void> {
  const url = process.env.EMISSOR_WEBHOOK_URL;
  const secret = process.env.EMISSOR_WEBHOOK_SECRET;
  if (!url || !secret) return; // não configurado = encaminhamento desligado, não é erro

  try {
    const signature = signForEmissor(rawBody, secret);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Emissor-Signature": signature },
      body: rawBody,
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) console.error(`[emissor-forward] emissor respondeu HTTP ${res.status}`);
  } catch (error) {
    console.error("[emissor-forward] falha ao encaminhar webhook pro emissor:", (error as Error).message);
  }
}

/** Extraída à parte pra ser testável sem rede. */
export function signForEmissor(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}
