import type { ClinicVerification, DoctorVerification, ExtractedData, QrCodeVerification, RiskAlert, TechnicalAnalysis } from "@prisma/client";
import { validateCid10 } from "@/lib/cid10";
import type { ChecklistItem } from "@/components/shared/verification-checklist";

type RequestForChecklist = {
  extractedData: ExtractedData | null;
  technicalAnalysis: TechnicalAnalysis | null;
  clinicVerification: ClinicVerification | null;
  doctorVerification: DoctorVerification | null;
  qrCodeVerification: QrCodeVerification | null;
  riskAnalysisAlerts: Pick<RiskAlert, "type">[];
};

/**
 * Builds the client-facing per-check breakdown from the same tables the
 * ops page already reads — one item per stage of the pipeline, in the
 * order it actually runs (see workflow.ts), each with its own honest
 * status instead of folding everything into a single score.
 *
 * Deliberately does NOT read `similarityMatches` here: a match's
 * `matchedRequestId` can point at another organization's request, and this
 * page is rendered for a client user — the only similarity signal safe to
 * show is whether a client-visible risk alert about it already exists
 * (computed and filtered server-side in risk-scoring.service.ts).
 */
export function buildVerificationChecklist(request: RequestForChecklist): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const { extractedData, technicalAnalysis, clinicVerification, doctorVerification, qrCodeVerification, riskAnalysisAlerts } = request;

  // 1. OCR / leitura do documento -----------------------------------------
  if (!extractedData) {
    items.push({ label: "Leitura do documento", status: "pending", description: "Aguardando leitura automática do arquivo enviado." });
  } else {
    const confidence = (extractedData.confidenceJson as { overall?: number } | null)?.overall;
    items.push({
      label: "Leitura do documento",
      status: confidence !== undefined && confidence < 60 ? "attention" : "ok",
      description:
        confidence !== undefined
          ? `Documento lido com ${confidence}% de confiança.`
          : "Documento lido com sucesso.",
    });
  }

  // 2. Análise técnica e de possível geração por IA ------------------------
  if (!technicalAnalysis) {
    items.push({ label: "Análise técnica e de conteúdo", status: "pending", description: "Aguardando análise técnica do arquivo." });
  } else {
    const aiScore = technicalAnalysis.aiGenerationRiskScore ?? 0;
    const aiFlag = aiScore >= 50;
    const manipulationFlag = (technicalAnalysis.manipulationRiskScore ?? 0) >= 30;
    const contentFlag = (technicalAnalysis.contentAuthenticityRiskScore ?? 0) >= 30;
    if (aiFlag) {
      items.push({
        label: "Análise técnica e de conteúdo",
        status: aiScore >= 90 ? "attention" : "neutral",
        description: `Indício técnico (${aiScore}%) de possível geração por inteligência artificial — resultado probabilístico.`,
      });
    } else if (manipulationFlag || contentFlag) {
      items.push({
        label: "Análise técnica e de conteúdo",
        status: "attention",
        description: "A análise técnica identificou elementos do arquivo ou do conteúdo que fogem do padrão esperado.",
      });
    } else {
      items.push({ label: "Análise técnica e de conteúdo", status: "ok", description: "Sem indícios relevantes de manipulação ou geração por IA." });
    }
  }

  // 3. CID-10 --------------------------------------------------------------
  if (!extractedData) {
    items.push({ label: "Código CID", status: "pending", description: "Aguardando leitura do documento." });
  } else if (!extractedData.cidCode) {
    items.push({ label: "Código CID", status: "neutral", description: "Nenhum código CID identificado no documento." });
  } else {
    const cid = validateCid10(extractedData.cidCode);
    items.push({
      label: "Código CID",
      status: cid.valid ? "ok" : "attention",
      description: cid.valid
        ? `Código "${extractedData.cidCode}" com formato e faixa compatíveis com a classificação CID-10.`
        : `Código "${extractedData.cidCode}" não corresponde a um formato/faixa reconhecidos da classificação CID-10.`,
    });
  }

  // 4. Clínica / instituição emissora --------------------------------------
  items.push(clinicChecklistItem(clinicVerification));

  // 5. Médico (CRM) ---------------------------------------------------------
  items.push(doctorChecklistItem(doctorVerification));

  // 6. QR Code / link de autenticação ---------------------------------------
  if (!qrCodeVerification) {
    items.push({ label: "QR Code / autenticação", status: "pending", description: "Aguardando verificação." });
  } else if (qrCodeVerification.status === "NOT_PRESENT") {
    items.push({ label: "QR Code / autenticação", status: "neutral", description: "Documento não possui QR Code ou link de autenticação." });
  } else if (qrCodeVerification.status === "VALID") {
    items.push({ label: "QR Code / autenticação", status: "ok", description: "Código de autenticação validado com sucesso." });
  } else {
    items.push({
      label: "QR Code / autenticação",
      status: "attention",
      description: "O código de autenticação não pôde ser validado — link inválido, inacessível ou domínio não reconhecido.",
    });
  }

  // 7. Semelhança com casos anteriores ---------------------------------------
  const hasSimilarityAlert = riskAnalysisAlerts.some((a) => a.type === "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT");
  items.push({
    label: "Semelhança com casos anteriores",
    status: hasSimilarityAlert ? "attention" : extractedData ? "ok" : "pending",
    description: hasSimilarityAlert
      ? "Foram encontradas semelhanças relevantes com um caso anterior não confirmado."
      : extractedData
        ? "Sem semelhanças relevantes com casos anteriores não confirmados."
        : "Aguardando verificação.",
  });

  return items;
}

function clinicChecklistItem(v: ClinicVerification | null): ChecklistItem {
  if (!v) return { label: "Clínica / instituição emissora", status: "pending", description: "Aguardando verificação." };
  if (v.status === "VALIDATED") return { label: "Clínica / instituição emissora", status: "ok", description: "Dados confirmados junto à fonte consultada." };
  if (v.status === "DIVERGENT") return { label: "Clínica / instituição emissora", status: "attention", description: "Dados informados divergem do registro oficial encontrado." };
  if (v.status === "NOT_FOUND") return { label: "Clínica / instituição emissora", status: "attention", description: "Não foi possível localizar a instituição na fonte consultada." };
  return { label: "Clínica / instituição emissora", status: "neutral", description: v.notes ?? "Não foi possível concluir a verificação com os dados disponíveis." };
}

function doctorChecklistItem(v: DoctorVerification | null): ChecklistItem {
  if (!v) return { label: "Médico (CRM)", status: "pending", description: "Aguardando verificação." };
  if (v.status === "VALIDATED") return { label: "Médico (CRM)", status: "ok", description: "Dados confirmados junto à fonte consultada." };
  if (v.status === "DIVERGENT") return { label: "Médico (CRM)", status: "attention", description: v.notes ?? "Dados informados divergem do registro oficial encontrado." };
  if (v.status === "NOT_FOUND") return { label: "Médico (CRM)", status: "attention", description: "Não foi possível localizar o CRM na fonte consultada." };
  return { label: "Médico (CRM)", status: "neutral", description: v.notes ?? "Não foi possível concluir a verificação com os dados disponíveis." };
}
