/** Loose, accent/punctuation/case-insensitive name comparison — for reconciling a user-typed name against an official registry record, not exact matching. */
function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["ltda", "me", "eireli", "sa", "s a", "epp", "de", "da", "do", "das", "dos", "e", "clinica", "hospital", "centro", "medico", "instituto"]);

export function namesLooselyMatch(a: string, b: string): boolean {
  const tokensA = normalizeForMatch(a).split(" ").filter((t) => t && !STOPWORDS.has(t));
  const tokensB = new Set(normalizeForMatch(b).split(" ").filter((t) => t && !STOPWORDS.has(t)));
  if (tokensA.length === 0 || tokensB.size === 0) return false;
  const overlap = tokensA.filter((t) => tokensB.has(t)).length;
  return overlap / tokensA.length >= 0.5;
}
