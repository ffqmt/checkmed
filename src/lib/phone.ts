/** Meta's WhatsApp API always uses digits-only phone numbers (no "+", spaces, or dashes) both when sending and in webhook payloads — normalizing consistently on both sides is what lets an inbound reply be matched back against the outbound message that prompted it. */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Brazilian mobile numbers carry an extra "9" digit after the DDD (55 + DDD
 * + 9 + 8 digits = 13 total) that older numbers/some contexts omit (55 +
 * DDD + 8 digits = 12). Confirmed live: the same physical number we sent an
 * outbound message to (13 digits) came back with only 12 digits as the
 * sender on the inbound reply's webhook — Meta doesn't normalize this
 * consistently. Returns every plausible representation of a number so a
 * lookup can match regardless of which form is on file.
 */
export function phoneNumberVariants(value: string): string[] {
  const digits = normalizePhoneNumber(value);
  const variants = new Set([digits]);
  if (digits.length === 13 && digits.startsWith("55") && digits[4] === "9") {
    variants.add(digits.slice(0, 4) + digits.slice(5));
  } else if (digits.length === 12 && digits.startsWith("55")) {
    variants.add(digits.slice(0, 4) + "9" + digits.slice(4));
  }
  return [...variants];
}

/**
 * Picks one stable representation among a number's plausible variants (the
 * shortest — the form without the optional BR "9") so both raw forms of the
 * same real contact collapse to a single inbox entry. Always run raw
 * fromNumber/toNumber values through this rather than assuming clean,
 * pre-normalized storage — not every write path normalizes before saving
 * (e.g. seed data).
 */
export function canonicalPhoneKey(value: string): string {
  const variants = phoneNumberVariants(value);
  return variants.reduce((shortest, v) => (v.length < shortest.length ? v : shortest), variants[0]);
}
