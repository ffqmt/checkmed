/**
 * CRM format plausibility check — deterministic, free, no registry lookup.
 * CRM numbers have no public checksum algorithm (they're sequential
 * per-state registrations, unlike CPF/CNPJ), so this can only catch
 * obviously-impossible values: a non-numeric CRM, an implausible digit
 * count, or a UF that isn't a real Brazilian state. It does NOT confirm the
 * doctor exists or that this specific number is registered to them — that
 * still requires a real conselho de classe lookup, which is pending a
 * vendor decision (see doctor-registry.service.ts).
 */
const VALID_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export type CrmFormatResult = {
  plausible: boolean;
  reason: "missing" | "not_numeric" | "implausible_digit_count" | "invalid_uf" | "ok";
};

export function checkCrmFormat(crm: string | null, uf: string | null): CrmFormatResult {
  if (!crm || !uf) return { plausible: false, reason: "missing" };

  const digits = crm.trim();
  if (!/^\d+$/.test(digits)) return { plausible: false, reason: "not_numeric" };
  if (digits.length < 3 || digits.length > 7) return { plausible: false, reason: "implausible_digit_count" };
  if (!VALID_UFS.includes(uf.trim().toUpperCase())) return { plausible: false, reason: "invalid_uf" };

  return { plausible: true, reason: "ok" };
}
