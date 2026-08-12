import { ocrService } from "./ocr.service";
import { extractionService } from "./extraction.service";
import { extractWithClaudeVision } from "./adapters/claude-vision-extraction.adapter";
import type { DocumentIntelligenceResult } from "./types";

export interface DocumentIntelligenceService {
  analyze(file: { buffer: Buffer; mimeType: string }): Promise<DocumentIntelligenceResult>;
}

/**
 * Provider selection mirrors ai-detection.service.ts. EXTRACTION_PROVIDER
 * unset/"MOCK" keeps the original two mock services (rawText is never read,
 * fields are randomized) so the app runs with zero external dependencies by
 * default. "CLAUDE_VISION" replaces both with a single real vision call that
 * actually reads the uploaded file. On any failure (auth, rate limit, safety
 * refusal) this falls back to the mock path rather than failing the whole
 * workflow — same resilience pattern as the Sightengine adapter.
 */
class DefaultDocumentIntelligenceService implements DocumentIntelligenceService {
  async analyze(file: { buffer: Buffer; mimeType: string }): Promise<DocumentIntelligenceResult> {
    const provider = (process.env.EXTRACTION_PROVIDER ?? "MOCK").toUpperCase();

    if (provider === "CLAUDE_VISION") {
      try {
        return await extractWithClaudeVision(file);
      } catch (error) {
        console.error("Claude vision extraction failed, falling back to mock extraction", error);
      }
    }

    const ocr = await ocrService.extractText(file);
    const extraction = await extractionService.extractStructuredData(ocr.rawText, { mimeType: file.mimeType });
    return { ocr, extraction, contentAuthenticityRiskScore: 0, contentFindings: [] };
  }
}

export const documentIntelligenceService: DocumentIntelligenceService = new DefaultDocumentIntelligenceService();
