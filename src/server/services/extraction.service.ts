import { simulateLatency, pick, randomInt, weightedPick } from "./mock-utils";
import type { ExtractedMedicalCertificateData } from "./types";

export interface MedicalCertificateExtractionService {
  extractStructuredData(
    rawText: string,
    fileMetadata: { mimeType: string },
  ): Promise<ExtractedMedicalCertificateData>;
}

const DOCTOR_NAMES = [
  "Dra. Fernanda Ribeiro Alves",
  "Dr. Marcelo Souza Lima",
  "Dra. Juliana Prado Martins",
  "Dr. Rafael Costa Nogueira",
  "Dra. Camila Andrade Teixeira",
  "Dr. Eduardo Vasconcelos Pinto",
];

const CRM_UFS = ["SP", "RJ", "MG", "RS", "PR", "BA"];

const CLINIC_NAMES = [
  "Clínica Vida Plena",
  "Hospital Santa Clara",
  "Centro Médico Bem Estar",
  "Instituto de Saúde Ocupacional São Lucas",
  "Clínica e Diagnóstico Nova Saúde",
  "Hospital Regional do Trabalhador",
];

const CID_CODES = ["J11", "M54.5", "A09", "F41.1", "J06.9", "K29.7", "M79.1"];

/**
 * Mock structured-extraction provider. In production this would call an
 * LLM (OpenAI/Claude) with a strict JSON schema over the OCR output, or a
 * specialized document-AI pipeline. Keep the same interface and swap the
 * body — see README "Como plugar IA de extração real".
 */
export class MockMedicalCertificateExtractionService
  implements MedicalCertificateExtractionService
{
  async extractStructuredData(
    _rawText: string,
    _fileMetadata: { mimeType: string },
  ): Promise<ExtractedMedicalCertificateData> {
    await simulateLatency(500, 1500);

    const quality = weightedPick([
      { value: "high" as const, weight: 55 },
      { value: "medium" as const, weight: 30 },
      { value: "low" as const, weight: 15 },
    ]);

    const warnings: string[] = [];
    const confidence: Record<string, number> = {};

    const doctorName = pick(DOCTOR_NAMES);
    const doctorCrm = String(randomInt(20000, 199999));
    const doctorCrmUf = pick(CRM_UFS);
    confidence.doctorName = quality === "high" ? randomInt(90, 99) : quality === "medium" ? randomInt(70, 89) : randomInt(40, 69);
    confidence.doctorCrm = confidence.doctorName - randomInt(0, 5);

    const clinicName = pick(CLINIC_NAMES);
    confidence.clinicName = quality === "high" ? randomInt(88, 99) : quality === "medium" ? randomInt(65, 87) : randomInt(35, 64);

    const absenceDays = pick([1, 1, 2, 2, 3, 5, 7, 10, 15]);
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - randomInt(0, 5));
    const absenceStartDate = new Date(issueDate);
    const absenceEndDate = new Date(issueDate);
    absenceEndDate.setDate(absenceEndDate.getDate() + absenceDays - 1);

    const hasQrCode = Math.random() < 0.65;
    const domain = pick(["autenticidade.saude.gov.br", "validar-doc.com.br", "clinicavidaplena.com.br", "docverify.net"]);

    if (quality === "low") {
      warnings.push("Qualidade de imagem prejudicou a leitura de parte dos campos.");
    }
    if (Math.random() < 0.08) {
      warnings.push("Campo de CID não identificado com segurança.");
    }

    return {
      doctorName,
      doctorCrm,
      doctorCrmUf,
      certificateIssueDate: issueDate,
      absenceDays,
      absenceStartDate,
      absenceEndDate,
      clinicName,
      clinicCnpj: `${randomInt(10, 99)}.${randomInt(100, 999)}.${randomInt(100, 999)}/0001-${randomInt(10, 99)}`,
      clinicCnes: String(randomInt(1000000, 9999999)),
      clinicAddress: `Rua ${pick(["das Acácias", "Sete de Setembro", "Barão do Rio Branco", "XV de Novembro"])}, ${randomInt(10, 2500)}`,
      clinicPhone: `(${randomInt(11, 99)}) ${randomInt(3000, 4999)}-${randomInt(1000, 9999)}`,
      clinicEmail: `contato@${clinicName.toLowerCase().replace(/[^a-z]+/g, "")}.com.br`,
      cidCode: pick(CID_CODES),
      qrCodeContent: hasQrCode ? `https://${domain}/verificar/${randomInt(100000, 999999)}` : null,
      authenticationUrl: hasQrCode ? `https://${domain}/verificar/${randomInt(100000, 999999)}` : null,
      confidence,
      warnings,
    };
  }
}

export const extractionService: MedicalCertificateExtractionService =
  new MockMedicalCertificateExtractionService();
