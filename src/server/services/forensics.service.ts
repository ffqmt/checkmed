import type { TechnicalFindings } from "./types";
import {
  analyzeImageMetadata,
  analyzePdfFonts,
  analyzePdfLayers,
  analyzePdfMetadata,
  extractLargestEmbeddedJpeg,
  type ForensicFinding,
} from "./forensics-analyzers";
import { aiDetectionService } from "./ai-detection.service";

export interface DocumentForensicsService {
  analyzeMetadata(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  detectPdfLayers(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  detectImageCompressionInconsistencies(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  detectFontInconsistencies(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  detectStampOrSignatureAnomalies(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  detectPossibleAiGeneration(file: { buffer: Buffer; mimeType: string }): Promise<number>;
  produceTechnicalFindings(file: { buffer: Buffer; mimeType: string }): Promise<TechnicalFindings>;
}

const isPdf = (mimeType: string) => mimeType === "application/pdf";

const COMPRESSION_CHECK_DISABLED_NOTE: ForensicFinding = {
  area: "Compressão de imagem",
  description:
    "A verificação de compressão localizada (indício de carimbo/assinatura colado de outra imagem real) está desativada nesta versão — uma implementação própria (JPEG Ghost) foi testada e não atingiu confiabilidade suficiente para produção. Isto é diferente da detecção de geração por IA abaixo, que já usa um provedor externo quando configurado.",
  severity: "info",
};

/**
 * Forensics provider. Phase 1 (always on, no vendor cost): PDF/EXIF
 * metadata signatures, PDF revision counting, embedded-font fingerprinting.
 * Phase 2 (on when AI_DETECTION_PROVIDER is configured): statistical
 * AI-generated-image / deepfake detection via `aiDetectionService`.
 *
 * Deliberately NOT active: pixel-level compression/splice analysis
 * (`detectImageCompressionInconsistencies`, `detectStampOrSignatureAnomalies`).
 * Both a plain Error Level Analysis and a JPEG-Ghost follow-up were
 * prototyped and validated against test documents — the first
 * false-positived on ordinary text-heavy documents, the second missed a
 * deliberately planted splice. Rather than ship an unreliable signal that
 * could wrongly flag a legitimate document, these return 0 and are excluded
 * from `manipulationRiskScore` until a specialized document-forensics
 * vendor is integrated (see README "Análise forense/antifraude").
 */
export class RealDocumentForensicsService implements DocumentForensicsService {
  async analyzeMetadata(file: { buffer: Buffer; mimeType: string }): Promise<number> {
    if (isPdf(file.mimeType)) {
      const { score } = await analyzePdfMetadata(file.buffer);
      return score;
    }
    const { score } = await analyzeImageMetadata(file.buffer);
    return score;
  }

  async detectPdfLayers(file: { buffer: Buffer; mimeType: string }): Promise<number> {
    if (!isPdf(file.mimeType)) return 0;
    return analyzePdfLayers(file.buffer).score;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectImageCompressionInconsistencies(_file: { buffer: Buffer; mimeType: string }): Promise<number> {
    return 0;
  }

  async detectFontInconsistencies(file: { buffer: Buffer; mimeType: string }): Promise<number> {
    if (!isPdf(file.mimeType)) return 0;
    const { pdfDoc } = await analyzePdfMetadata(file.buffer);
    return analyzePdfFonts(pdfDoc).score;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectStampOrSignatureAnomalies(_file: { buffer: Buffer; mimeType: string }): Promise<number> {
    return 0;
  }

  async detectPossibleAiGeneration(file: { buffer: Buffer; mimeType: string }): Promise<number> {
    const metaResult = isPdf(file.mimeType) ? await analyzePdfMetadata(file.buffer) : null;
    const imageBuffer = isPdf(file.mimeType)
      ? extractLargestEmbeddedJpeg(metaResult!.pdfDoc)
      : file.buffer;

    if (imageBuffer) {
      const vendorResult = await aiDetectionService.detect({ buffer: imageBuffer, mimeType: isPdf(file.mimeType) ? "image/jpeg" : file.mimeType });
      if (vendorResult.status === "OK" && vendorResult.aiGeneratedScore !== null) {
        return Math.max(vendorResult.aiGeneratedScore, vendorResult.deepfakeScore ?? 0);
      }
    }

    const findings = metaResult
      ? metaResult.findings
      : (await analyzeImageMetadata(file.buffer)).findings;
    return findings.some((f) => f.area === "Geração por IA") ? 65 : 8;
  }

  async produceTechnicalFindings(file: { buffer: Buffer; mimeType: string }): Promise<TechnicalFindings> {
    const findings: ForensicFinding[] = [COMPRESSION_CHECK_DISABLED_NOTE];
    let metadataRiskScore = 0;
    let layerInconsistencyScore = 0;
    let fontInconsistencyScore = 0;
    let aiGenerationRiskScore = 8;
    let status: TechnicalFindings["status"] = "COMPLETED";
    let externalProviderName: string | null = null;
    let externalProviderResponseJson: TechnicalFindings["externalProviderResponseJson"] = null;
    const activeScores: number[] = [];

    let metadataFindings: ForensicFinding[] = [];
    let imageBuffer: Buffer | null = null;

    if (isPdf(file.mimeType)) {
      const metaResult = await analyzePdfMetadata(file.buffer);
      metadataRiskScore = metaResult.score;
      metadataFindings = metaResult.findings;
      findings.push(...metaResult.findings);
      activeScores.push(metadataRiskScore);

      if (!metaResult.pdfDoc) {
        status = "INCONCLUSIVE";
        findings.push({
          area: "Metadados",
          description: "O arquivo PDF não pôde ser completamente interpretado (pode estar protegido, corrompido ou usar um formato não padrão).",
          severity: "low",
        });
      } else {
        const layerResult = analyzePdfLayers(file.buffer);
        layerInconsistencyScore = layerResult.score;
        findings.push(...layerResult.findings);
        activeScores.push(layerInconsistencyScore);

        const fontResult = analyzePdfFonts(metaResult.pdfDoc);
        fontInconsistencyScore = fontResult.score;
        findings.push(...fontResult.findings);
        activeScores.push(fontInconsistencyScore);

        imageBuffer = extractLargestEmbeddedJpeg(metaResult.pdfDoc);
      }
    } else {
      const metaResult = await analyzeImageMetadata(file.buffer);
      metadataRiskScore = metaResult.score;
      metadataFindings = metaResult.findings;
      findings.push(...metaResult.findings);
      activeScores.push(metadataRiskScore);
      imageBuffer = file.buffer;
    }

    // AI-generation / deepfake detection — real vendor when configured, free metadata-signature fallback otherwise.
    const declaredByMetadata = metadataFindings.some((f) => f.area === "Geração por IA");
    if (imageBuffer) {
      const vendorResult = await aiDetectionService.detect({
        buffer: imageBuffer,
        mimeType: isPdf(file.mimeType) ? "image/jpeg" : file.mimeType,
      });

      if (vendorResult.status === "OK" && vendorResult.aiGeneratedScore !== null) {
        aiGenerationRiskScore = Math.max(vendorResult.aiGeneratedScore, declaredByMetadata ? 65 : 0, vendorResult.deepfakeScore ?? 0);
        externalProviderName = vendorResult.provider;
        externalProviderResponseJson = vendorResult.rawResponse;
        if (aiGenerationRiskScore >= 30) {
          findings.push({
            area: "Geração por IA",
            description: `Provedor externo (${vendorResult.provider}) estimou ${vendorResult.aiGeneratedScore}% de probabilidade de conteúdo gerado por IA${vendorResult.deepfakeScore ? ` e ${vendorResult.deepfakeScore}% de indício de deepfake` : ""} — resultado probabilístico, não conclusivo.`,
            severity: aiGenerationRiskScore >= 60 ? "high" : "medium",
          });
        }
      } else {
        aiGenerationRiskScore = declaredByMetadata ? 65 : 8;
        if (vendorResult.status === "ERROR") {
          findings.push({
            area: "Geração por IA",
            description: `Não foi possível consultar o provedor de detecção de IA (${vendorResult.error ?? "erro desconhecido"}) — resultado baseado apenas em metadados.`,
            severity: "info",
          });
        } else if (vendorResult.status === "NOT_CONFIGURED") {
          findings.push({
            area: "Geração por IA",
            description: "Nenhum provedor de detecção estatística de IA está configurado (AI_DETECTION_PROVIDER) — resultado baseado apenas em metadados, que só pega o caso de a própria ferramenta se declarar no arquivo.",
            severity: "info",
          });
        }
      }
    } else {
      aiGenerationRiskScore = declaredByMetadata ? 65 : 8;
    }

    const manipulationRiskScore = activeScores.length
      ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)
      : 0;

    return {
      metadataRiskScore,
      manipulationRiskScore,
      aiGenerationRiskScore,
      compressionInconsistencyScore: 0,
      fontInconsistencyScore,
      layerInconsistencyScore,
      signatureStampInconsistencyScore: 0,
      // Set by the caller from the document-intelligence extraction step — a
      // content/text signal, unrelated to the pixel/metadata analysis done here.
      contentAuthenticityRiskScore: 0,
      findings,
      status,
      externalProviderName,
      externalProviderResponseJson,
    };
  }
}

export const documentForensicsService: DocumentForensicsService = new RealDocumentForensicsService();
