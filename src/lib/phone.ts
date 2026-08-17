/** Meta's WhatsApp API always uses digits-only phone numbers (no "+", spaces, or dashes) both when sending and in webhook payloads — normalizing consistently on both sides is what lets an inbound reply be matched back against the outbound message that prompted it. */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}
