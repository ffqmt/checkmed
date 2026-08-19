/**
 * Meta's Graph API errors come back as English prose meant for developers,
 * not the Portuguese-speaking analyst reading it in the Central de
 * Mensagens. This translates the handful of error shapes that actually show
 * up in practice into something they can act on — everything else falls
 * back to the raw Meta text rather than inventing an explanation.
 */
export function explainWhatsAppError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (lower.includes("re-engagement") || lower.includes("24 hours") || lower.includes("24-hour")) {
    return "Não enviado: já se passaram mais de 24h desde a última mensagem desse contato. O WhatsApp só permite reabrir a conversa com uma mensagem de modelo aprovada — use \"Enviar modelo\" abaixo.";
  }
  if (lower.includes("template") && (lower.includes("does not exist") || lower.includes("not found") || lower.includes("param invalid"))) {
    return "Não enviado: o modelo de mensagem usado ainda não foi aprovado pela Meta (ou o nome não bate com o aprovado no Business Manager).";
  }
  if (lower.includes("phone number") && lower.includes("invalid")) {
    return "Não enviado: número de telefone em formato inválido para o WhatsApp.";
  }
  if (lower.includes("access token") || lower.includes("oauth")) {
    return "Não enviado: token de acesso do WhatsApp Business expirado ou inválido — reconfigure em Admin → WhatsApp.";
  }
  return raw;
}

/** Meta only allows free-form (non-template) messages within 24h of the contact's last inbound message — outside that window, only an approved template can restart the conversation. */
export function isOutsideEngagementWindow(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return true;
  return Date.now() - lastInboundAt.getTime() > 24 * 60 * 60 * 1000;
}
