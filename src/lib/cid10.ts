/**
 * CID-10 (ICD-10) format + chapter-range validation — deterministic, no
 * external dependency. The full classification has ~14,000+ granular codes;
 * shipping a complete, always-accurate copy of that table is its own
 * maintenance burden. What's checked here — format and whether the
 * letter+number falls inside one of the classification's real chapters — is
 * the stable, public structure of CID-10 that doesn't change, and it's
 * enough to catch what actually shows up in fabricated documents: malformed
 * placeholders ("cid"), codes outside any real chapter, or gibberish.
 * Worded in findings as "formato e faixa compatíveis", not "existe no
 * catálogo completo" — this does not confirm the exact 4-character code is
 * real, only that it's plausible.
 */

const CID10_CHAPTERS: Array<{ letters: string; min: number; max: number }> = [
  { letters: "AB", min: 0, max: 99 }, // Doenças infecciosas e parasitárias
  { letters: "C", min: 0, max: 97 }, // Neoplasias (malignas)
  { letters: "D", min: 0, max: 48 }, // Neoplasias (in situ/benignas/incertas)
  { letters: "D", min: 50, max: 89 }, // Sangue e órgãos hematopoéticos
  { letters: "E", min: 0, max: 90 }, // Endócrinas, nutricionais e metabólicas
  { letters: "F", min: 0, max: 99 }, // Transtornos mentais e comportamentais
  { letters: "G", min: 0, max: 99 }, // Sistema nervoso
  { letters: "H", min: 0, max: 59 }, // Olho e anexos
  { letters: "H", min: 60, max: 95 }, // Ouvido e apófise mastoide
  { letters: "I", min: 0, max: 99 }, // Aparelho circulatório
  { letters: "J", min: 0, max: 99 }, // Aparelho respiratório
  { letters: "K", min: 0, max: 93 }, // Aparelho digestivo
  { letters: "L", min: 0, max: 99 }, // Pele e tecido subcutâneo
  { letters: "M", min: 0, max: 99 }, // Sistema osteomuscular
  { letters: "N", min: 0, max: 99 }, // Aparelho geniturinário
  { letters: "O", min: 0, max: 99 }, // Gravidez, parto e puerpério
  { letters: "P", min: 0, max: 96 }, // Afecções do período perinatal
  { letters: "Q", min: 0, max: 99 }, // Malformações congênitas
  { letters: "R", min: 0, max: 99 }, // Sintomas, sinais e achados anormais
  { letters: "S", min: 0, max: 99 }, // Traumatismos, lesões (S)
  { letters: "T", min: 0, max: 98 }, // Traumatismos, lesões (T)
  { letters: "V", min: 1, max: 99 }, // Causas externas — transporte
  { letters: "W", min: 0, max: 99 }, // Causas externas — outras
  { letters: "X", min: 0, max: 99 }, // Causas externas — outras
  { letters: "Y", min: 0, max: 98 }, // Causas externas — outras
  { letters: "Z", min: 0, max: 99 }, // Fatores que influenciam o estado de saúde
];

export type Cid10ValidationResult = {
  valid: boolean;
  reason: "empty" | "bad_format" | "outside_known_chapter" | "ok";
};

export function validateCid10(rawCode: string | null): Cid10ValidationResult {
  if (!rawCode || !rawCode.trim()) return { valid: false, reason: "empty" };

  const code = rawCode.trim().toUpperCase();
  const match = /^([A-Z])(\d{2})(?:\.?(\d))?$/.exec(code);
  if (!match) return { valid: false, reason: "bad_format" };

  const letter = match[1];
  const number = Number(match[2]);

  const inChapter = CID10_CHAPTERS.some((c) => c.letters.includes(letter) && number >= c.min && number <= c.max);
  if (!inChapter) return { valid: false, reason: "outside_known_chapter" };

  return { valid: true, reason: "ok" };
}
