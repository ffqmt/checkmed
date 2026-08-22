/**
 * O emissor (produto irmão, mesmo número WhatsApp) não tem webhook próprio
 * na Meta — só recebe uma cópia encaminhada (ver emissor-forward.service.ts).
 * Esta função decide quais mensagens são "provavelmente dele" pra não
 * gravar como ruído no inbox do MedCheck.
 *
 * Match é sempre EXATO no corpo inteiro da mensagem, nunca "contém" —
 * minimiza falso positivo com uma mensagem real de cliente do MedCheck.
 * Um falso NEGATIVO (deixar passar pro MedCheck por engano) é o lado
 * seguro: vira só ruído no inbox, a conversa não se perde. Um falso
 * POSITIVO seria pior — uma mensagem real de cliente do MedCheck nunca
 * gravada — por isso o critério é deliberadamente estreito.
 */

const EMISSOR_COMMAND_WORDS = (process.env.EMISSOR_COMMAND_WORDS ?? "notas,status,menu")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

export function looksLikeEmissorMessage(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();

  if (/^\d{6}$/.test(normalized)) return true; // código de verificação de 6 dígitos
  if (EMISSOR_COMMAND_WORDS.includes(normalized)) return true;
  if (/^status\s+\d+$/.test(normalized)) return true;

  return false;
}

type MetaWebhookMessage = { text?: { body?: string } };
type MetaWebhookValue = { messages?: MetaWebhookMessage[]; [key: string]: unknown };
type MetaWebhookChange = { value?: MetaWebhookValue; [key: string]: unknown };
type MetaWebhookEntry = { changes?: MetaWebhookChange[]; [key: string]: unknown };
type MetaWebhookPayload = { entry?: MetaWebhookEntry[]; [key: string]: unknown };

/**
 * Devolve uma cópia do payload com as mensagens que parecem ser do
 * emissor removidas de `value.messages` — `statuses` (recibos de entrega)
 * nunca são tocados, continuam sendo processados normalmente mesmo pra
 * mensagens que o emissor mandou (quem envia é o emissor via Graph API
 * direto, não o MedCheck, mas o status de entrega de tudo que sai desse
 * número passa por aqui mesmo assim — deixar passar é inofensivo).
 */
export function stripEmissorBoundMessages(payload: MetaWebhookPayload): MetaWebhookPayload {
  return {
    ...payload,
    entry: payload.entry?.map((entry) => ({
      ...entry,
      changes: entry.changes?.map((change) => {
        if (!change.value?.messages) return change;
        return {
          ...change,
          value: {
            ...change.value,
            messages: change.value.messages.filter((m) => !looksLikeEmissorMessage(m.text?.body)),
          },
        };
      }),
    })),
  };
}
