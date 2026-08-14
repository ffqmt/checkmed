import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

/**
 * Drafts a suggested final report (parecer) from the verification data
 * already collected for a request — the analyst reviews and edits before
 * emitting anything; this never submits on its own (see
 * suggestFinalReportDraft in server/actions/final-reports.ts and the
 * "Sugestão da IA" button in final-report-form.tsx).
 *
 * Deliberately never sees the CID code, the raw OCR text, or the QR code's
 * decoded content — the report-suggestion context is built by the caller
 * from already-verified structured fields only, the same restriction
 * already applied to the client-facing "Dados extraídos" tab and "Resumo
 * do atestado" card (see CID_REDACTED_LABEL in lib/constants.ts).
 */
export type ReportSuggestionContext = {
  riskAnalysis: {
    score: number;
    riskLevel: string;
    summary: string | null;
    positiveIndicators: string[];
    negativeIndicators: string[];
    alerts: { title: string; description: string; severity: string; type: string }[];
  } | null;
  doctorVerification: {
    informedDoctorName: string | null;
    officialDoctorName: string | null;
    informedCrm: string | null;
    informedCrmUf: string | null;
    officialCrm: string | null;
    officialCrmUf: string | null;
    registrationStatus: string | null;
    specialty: string | null;
    status: string;
    notes: string | null;
  } | null;
  clinicVerification: {
    informedClinicName: string | null;
    officialName: string | null;
    informedCnpj: string | null;
    officialCnpj: string | null;
    officialAddress: string | null;
    status: string;
    notes: string | null;
  } | null;
  qrCodeVerification: {
    status: string;
    domain: string | null;
    isDomainTrusted: boolean | null;
    httpStatus: number | null;
    notes: string | null;
  } | null;
  technicalAnalysis: {
    metadataRiskScore: number | null;
    manipulationRiskScore: number | null;
    aiGenerationRiskScore: number | null;
    contentAuthenticityRiskScore: number | null;
    compressionInconsistencyScore: number | null;
    fontInconsistencyScore: number | null;
    layerInconsistencyScore: number | null;
    signatureStampInconsistencyScore: number | null;
    externalProviderName: string | null;
    findings: { area: string; description: string; severity: string }[];
  } | null;
  extractedData: {
    doctorName: string | null;
    doctorCrm: string | null;
    doctorCrmUf: string | null;
    certificateIssueDate: string | null;
    absenceDays: number | null;
    absenceStartDate: string | null;
    absenceEndDate: string | null;
    clinicName: string | null;
    clinicCnpj: string | null;
    clinicCnes: string | null;
    clinicAddress: string | null;
    extractionWarnings: string[];
  } | null;
  contactAttempts: {
    contactType: string;
    contactTarget: string;
    result: string;
    attemptedAt: string;
    contactedPersonName: string | null;
    contactedPersonRole: string | null;
    notes: string | null;
  }[];
  similarityMatches: { matchType: string; similarityScore: number; explanation: string | null }[];
};

const SuggestedReportSchema = z.object({
  result: z.enum(["VALIDATED", "VALIDATED_WITH_REMARKS", "INCONCLUSIVE", "INCONSISTENT", "NOT_CONFIRMED", "NOT_RECOGNIZED_BY_INSTITUTION"]),
  executiveSummary: z.string().describe("Resumo executivo do parecer, em português, citando os métodos e fontes realmente usados nos dados fornecidos."),
  limitations: z.string().describe('Limitações da análise, se houver. Vazio ("") se nenhuma.'),
  clientVisibleNotes: z.string().describe('Nota curta e direta para o cliente. Vazio ("") se nenhuma observação adicional for necessária.'),
});

const SYSTEM_PROMPT = `Você ajuda um analista humano da MedCheck a redigir um RASCUNHO de parecer final sobre um atestado médico. Este texto é sempre revisado e editado por um humano antes de qualquer publicação — você nunca decide sozinho, apenas propõe.

Regras:
- Baseie-se exclusivamente nos dados estruturados fornecidos abaixo. Nunca invente, presuma ou infira qualquer fato que não esteja explicitamente presente nesses dados.
- O código CID (diagnóstico) não é fornecido a você intencionalmente — não mencione, não hipotetize e não faça referência a ele de nenhuma forma.
- Use linguagem neutra e não acusatória o tempo todo, mesmo diante de inconsistências relevantes — descreva o que foi ou não confirmado junto às fontes consultadas, nunca afirme fraude, falsificação ou má-fé.
- O campo "result" deve refletir o conjunto de evidências: confirmações favoráveis (médico/clínica validados, sem indícios técnicos) sugerem "VALIDATED" ou "VALIDATED_WITH_REMARKS"; divergências ou indícios técnicos relevantes sugerem "INCONSISTENT" ou "NOT_CONFIRMED"; dados insuficientes sugerem "INCONCLUSIVE".
- Se algo não pôde ser verificado (ex.: clínica sem CNPJ no documento), diga isso como uma limitação factual, não como uma falha do titular do atestado.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function suggestFinalReport(context: ReportSuggestionContext) {
  const response = await getClient().messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Dados de verificação coletados para este atestado:\n\n${JSON.stringify(context, null, 2)}\n\nRedija o rascunho de parecer.`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(SuggestedReportSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Claude não retornou uma sugestão estruturada válida.");
  }
  return parsed;
}
