import { prisma } from "@/lib/prisma";
import { ocrService } from "./ocr.service";
import { extractionService } from "./extraction.service";
import { fetchRawExtraction, normalizeExtraction, type RawClaudeExtraction } from "./adapters/claude-vision-extraction.adapter";
import { sha256Of } from "./storage.service";
import { pick, randomInt } from "./mock-utils";
import type { DocumentIntelligenceResult } from "./types";

export interface DocumentIntelligenceService {
  analyze(file: { buffer: Buffer; mimeType: string }): Promise<DocumentIntelligenceResult>;
}

const MOCK_PATIENT_NAMES = [
  "Ana Beatriz Souza Lima",
  "Carlos Eduardo Ferreira",
  "Patrícia Gomes Cardoso",
  "Bruno Henrique Almeida",
  "Larissa Martins Rocha",
];

/** Builds a check-digit-valid CPF so local dev, which never runs the real check-digit code path against a fabricated value, still exercises it the same way production would. */
function mockCpf(): string {
  const base = Array.from({ length: 9 }, () => randomInt(0, 9));
  const checkDigit = (digits: number[]) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (digits.length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const d1 = checkDigit(base);
  const d2 = checkDigit([...base, d1]);
  return [...base, d1, d2].join("");
}

/**
 * Provider selection mirrors ai-detection.service.ts. EXTRACTION_PROVIDER
 * unset/"MOCK" keeps the original two mock services (rawText is never read,
 * fields are randomized) so the app runs with zero external dependencies by
 * default. "CLAUDE_VISION" replaces both with a single real vision call that
 * actually reads the uploaded file. On any failure (auth, rate limit, safety
 * refusal) this falls back to the mock path rather than failing the whole
 * workflow — same resilience pattern as the Sightengine adapter.
 *
 * Claude Vision results are cached by the file's own sha256 hash
 * (DocumentIntelligenceCache) — the pre-fill preview step on the new-request
 * form and the real validation workflow both read the same uploaded bytes,
 * and without this every request would pay for the same document twice.
 */
class DefaultDocumentIntelligenceService implements DocumentIntelligenceService {
  async analyze(file: { buffer: Buffer; mimeType: string }): Promise<DocumentIntelligenceResult> {
    const provider = (process.env.EXTRACTION_PROVIDER ?? "MOCK").toUpperCase();

    if (provider === "CLAUDE_VISION") {
      try {
        const sha256Hash = sha256Of(file.buffer);
        const cached = await prisma.documentIntelligenceCache.findUnique({ where: { sha256Hash } });
        const raw = cached ? (cached.rawExtractionJson as unknown as RawClaudeExtraction) : await fetchRawExtraction(file);
        if (!cached) {
          await prisma.documentIntelligenceCache
            .create({ data: { sha256Hash, rawExtractionJson: raw } })
            .catch((error) => console.error("[document-intelligence] failed to write cache", error));
        }
        return normalizeExtraction(raw);
      } catch (error) {
        console.error("Claude vision extraction failed, falling back to mock extraction", error);
      }
    }

    const ocr = await ocrService.extractText(file);
    const extraction = await extractionService.extractStructuredData(ocr.rawText, { mimeType: file.mimeType });
    return {
      ocr,
      extraction,
      contentAuthenticityRiskScore: 0,
      contentFindings: [],
      patientName: pick(MOCK_PATIENT_NAMES),
      patientCpf: mockCpf(),
    };
  }
}

export const documentIntelligenceService: DocumentIntelligenceService = new DefaultDocumentIntelligenceService();
