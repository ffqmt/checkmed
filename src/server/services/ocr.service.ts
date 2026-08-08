import { simulateLatency, randomInt, weightedPick } from "./mock-utils";
import type { OcrResult } from "./types";

export interface OcrService {
  extractText(file: { buffer: Buffer; mimeType: string }): Promise<OcrResult>;
}

const SAMPLE_TEXT = `ATESTADO MÉDICO

Atesto para os devidos fins que o(a) paciente esteve sob meus cuidados
profissionais, necessitando de afastamento de suas atividades laborais
por motivo de saúde, pelo período informado abaixo.

CID: {{cid}}
Período de afastamento: {{days}} dia(s)

Local e data: {{city}}, {{date}}

_________________________________
{{doctorName}}
CRM {{crm}}/{{uf}}
{{clinicName}}`;

/**
 * Mock OCR provider. Plug a real provider by implementing OcrService with
 * the same signature — e.g. Google Vision (documentTextDetection), AWS
 * Textract (AnalyzeDocument), Azure Document Intelligence (prebuilt-read),
 * or a local Tesseract worker. See README "Como plugar OCR real".
 */
export class MockOcrService implements OcrService {
  async extractText(file: { buffer: Buffer; mimeType: string }): Promise<OcrResult> {
    await simulateLatency(400, 1200);

    const confidence = weightedPick([
      { value: randomInt(92, 99), weight: 55 },
      { value: randomInt(75, 91), weight: 30 },
      { value: randomInt(45, 74), weight: 15 },
    ]);

    const warnings: string[] = [];
    if (confidence < 75) warnings.push("Baixa nitidez detectada em parte do documento.");
    if (confidence < 60) warnings.push("Trechos do texto não puderam ser lidos com segurança.");
    if (file.mimeType === "application/pdf" && Math.random() < 0.1) {
      warnings.push("Documento possui múltiplas páginas; apenas a primeira foi priorizada.");
    }

    return {
      rawText: SAMPLE_TEXT,
      confidence,
      warnings,
    };
  }
}

export const ocrService: OcrService = new MockOcrService();
