import type { RiskAlertType, AlertSeverity } from "@prisma/client";
import type { RiskScoringInput, RiskScoringResult } from "./types";

export interface RiskScoringService {
  score(input: RiskScoringInput): RiskScoringResult;
}

type Alert = {
  type: RiskAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  isClientVisible: boolean;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function riskLevelFromScore(score: number): RiskScoringResult["riskLevel"] {
  if (score >= 85) return "VERY_LOW";
  if (score >= 70) return "LOW";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "HIGH";
  return "CRITICAL";
}

/**
 * Deterministic scoring engine — no randomness here. Every adjustment is
 * explainable and traced into positive/negative indicators + alerts so the
 * final report can justify the score. Thresholds mirror the product rules
 * in section 33 of the spec and are intentionally centralized so they can
 * be made configurable per organization later.
 */
export class DefaultRiskScoringService implements RiskScoringService {
  score(input: RiskScoringInput): RiskScoringResult {
    let score = 55;
    const positives: string[] = [];
    const negatives: string[] = [];
    const alerts: Alert[] = [];
    // A near-certain AI-generation result is specific and strong enough that
    // no combination of other signals should be able to outweigh it (e.g. a
    // mocked/lucky doctor "confirmation" adding more points than a 99%
    // AI-generation score subtracts). Applied after every other adjustment,
    // right before the final clamp.
    let scoreCeiling: number | null = null;

    // --- Doctor verification --------------------------------------------
    const doctor = input.doctorVerification;
    if (doctor?.status === "VALIDATED") {
      const bonus = 20 * ((doctor.matchScore ?? 100) / 100);
      score += bonus;
      positives.push("Médico identificado confirmado junto ao conselho de classe.");
    } else if (doctor?.status === "DIVERGENT") {
      score -= 22;
      negatives.push("Dados do médico divergem do registro oficial.");
      alerts.push({
        type: "DOCTOR_NAME_DIVERGENT",
        severity: "HIGH",
        title: "Dados do médico divergentes",
        description: "O nome ou CRM informado no atestado diverge do registro oficial encontrado.",
        isClientVisible: true,
      });
    } else if (doctor?.status === "NOT_FOUND") {
      score -= 20;
      negatives.push("CRM informado não foi localizado na fonte consultada.");
      alerts.push({
        type: "CRM_NOT_FOUND",
        severity: "HIGH",
        title: "CRM não localizado",
        description: "Não foi possível localizar o CRM informado na fonte de consulta.",
        isClientVisible: true,
      });
    } else {
      score -= 6;
      negatives.push("Validação do médico inconclusiva ou fonte indisponível.");
    }

    // --- Clinic verification --------------------------------------------
    const clinic = input.clinicVerification;
    if (clinic?.status === "VALIDATED") {
      const bonus = 15 * ((clinic.matchScore ?? 100) / 100);
      score += bonus;
      positives.push("Clínica/hospital emissor confirmado em fonte oficial.");
    } else if (clinic?.status === "DIVERGENT") {
      score -= 16;
      negatives.push("Dados da clínica divergem do registro oficial.");
      alerts.push({
        type: "CLINIC_DATA_DIVERGENT",
        severity: "MEDIUM",
        title: "Dados da clínica divergentes",
        description: "Endereço, telefone ou CNPJ informados divergem do cadastro oficial.",
        isClientVisible: true,
      });
    } else if (clinic?.status === "NOT_FOUND") {
      score -= 10;
      negatives.push("Clínica/hospital não localizado na fonte consultada.");
      alerts.push({
        type: "CLINIC_NOT_FOUND",
        severity: "MEDIUM",
        title: "Clínica não localizada",
        description: "Não foi possível localizar a clínica/hospital informado na fonte de consulta.",
        isClientVisible: true,
      });
    } else {
      score -= 3;
    }

    // --- QR Code / authentication link -----------------------------------
    const qr = input.qrCodeVerification;
    if (qr?.status === "VALID") {
      score += 10;
      positives.push("Código de autenticação (QR Code) validado com sucesso.");
    } else if (qr?.status === "DOMAIN_SUSPICIOUS") {
      score -= 15;
      negatives.push("Domínio do link de autenticação não é reconhecido como confiável.");
      alerts.push({
        type: "QR_CODE_DOMAIN_SUSPICIOUS",
        severity: "HIGH",
        title: "Domínio não reconhecido",
        description: "O link de autenticação aponta para um domínio fora da lista de emissores confiáveis conhecidos.",
        isClientVisible: true,
      });
    } else if (qr?.status === "DATA_MISMATCH") {
      score -= 18;
      negatives.push("Dados retornados pela página de autenticação não coincidem com o documento.");
      alerts.push({
        type: "AUTHENTICATION_DATA_MISMATCH",
        severity: "HIGH",
        title: "Divergência na autenticação",
        description: "Os dados retornados pelo link de autenticação não coincidem com os dados extraídos do documento.",
        isClientVisible: true,
      });
    } else if (qr?.status === "INVALID" || qr?.status === "UNREACHABLE") {
      score -= 8;
      negatives.push("Código de autenticação inválido ou inacessível.");
      alerts.push({
        type: "QR_CODE_INVALID",
        severity: "MEDIUM",
        title: "QR Code não pôde ser validado",
        description: "O código de autenticação não pôde ser validado — link inválido ou indisponível.",
        isClientVisible: false,
      });
    }

    // --- Technical / forensic analysis ------------------------------------
    const tech = input.technicalAnalysis;
    if (tech) {
      score -= tech.manipulationRiskScore * 0.22;
      score -= tech.aiGenerationRiskScore * 0.13;

      if (tech.manipulationRiskScore >= 55) {
        negatives.push("Indicadores técnicos apontam possíveis inconsistências no arquivo.");
        alerts.push({
          type: "METADATA_SUSPICIOUS",
          severity: "HIGH",
          title: "Indícios técnicos relevantes",
          description: "A análise técnica do arquivo identificou possíveis indícios de manipulação.",
          isClientVisible: false,
        });
      } else if (tech.manipulationRiskScore >= 30) {
        alerts.push({
          type: "METADATA_SUSPICIOUS",
          severity: "MEDIUM",
          title: "Indícios técnicos moderados",
          description: "A análise técnica identificou indícios leves a moderados que recomendam atenção.",
          isClientVisible: false,
        });
      } else {
        positives.push("Análise técnica do arquivo sem indícios relevantes de manipulação.");
      }

      if (tech.aiGenerationRiskScore >= 90) {
        negatives.push("Forte indício técnico de conteúdo gerado por inteligência artificial.");
        alerts.push({
          type: "POSSIBLE_AI_GENERATION",
          severity: "CRITICAL",
          title: "Forte indício de geração por IA",
          description: "Provedor externo de detecção estimou probabilidade muito alta de geração por inteligência artificial. Resultado probabilístico — não representa confirmação — mas forte o suficiente para exigir revisão humana obrigatória, independentemente de outros sinais favoráveis.",
          isClientVisible: false,
        });
        scoreCeiling = 35;
      } else if (tech.aiGenerationRiskScore >= 50) {
        alerts.push({
          type: "POSSIBLE_AI_GENERATION",
          severity: "MEDIUM",
          title: "Possíveis indícios de geração por IA",
          description: "Resultado probabilístico — não representa confirmação de geração por inteligência artificial.",
          isClientVisible: false,
        });
      }

      score -= tech.contentAuthenticityRiskScore * 0.28;
      if (tech.contentAuthenticityRiskScore >= 55) {
        negatives.push("Conteúdo do documento apresenta características que fogem do padrão esperado.");
        alerts.push({
          type: "CONTENT_AUTHENTICITY_CONCERN",
          severity: "HIGH",
          title: "Indícios no conteúdo do documento",
          description: "A leitura do documento identificou elementos de texto ou layout fora do padrão esperado para este tipo de documento.",
          isClientVisible: false,
        });
      } else if (tech.contentAuthenticityRiskScore >= 30) {
        alerts.push({
          type: "CONTENT_AUTHENTICITY_CONCERN",
          severity: "MEDIUM",
          title: "Indícios moderados no conteúdo do documento",
          description: "A leitura do documento identificou elementos leves a moderados que recomendam atenção.",
          isClientVisible: false,
        });
      }
    }

    // --- OCR confidence -----------------------------------------------------
    if (input.ocrConfidence !== null && input.ocrConfidence !== undefined) {
      if (input.ocrConfidence < 60) {
        score -= 12;
        negatives.push("Baixa confiança na leitura automática do documento.");
        alerts.push({
          type: "LOW_OCR_CONFIDENCE",
          severity: "MEDIUM",
          title: "Baixa confiança de leitura",
          description: "A leitura automática do documento teve confiança baixa, o que pode indicar dados incompletos.",
          isClientVisible: false,
        });
      } else if (input.ocrConfidence < 78) {
        score -= 5;
      } else {
        positives.push("Leitura automática do documento com alta confiança.");
      }
    }

    // --- Dates / absence period consistency ---------------------------------
    const extracted = input.extractedData;
    if (extracted?.certificateIssueDate && extracted.certificateIssueDate.getTime() > Date.now() + 86400000) {
      score -= 15;
      negatives.push("Data de emissão do atestado é futura em relação à data atual.");
      alerts.push({
        type: "FUTURE_ISSUE_DATE",
        severity: "HIGH",
        title: "Data de emissão futura",
        description: "A data de emissão informada no documento é posterior à data atual.",
        isClientVisible: true,
      });
    }
    if (
      extracted?.absenceStartDate &&
      extracted.absenceEndDate &&
      extracted.absenceDays !== null &&
      extracted.absenceDays !== undefined
    ) {
      const diffDays =
        Math.round(
          (extracted.absenceEndDate.getTime() - extracted.absenceStartDate.getTime()) / 86400000,
        ) + 1;
      if (diffDays !== extracted.absenceDays) {
        score -= 8;
        negatives.push("Período de afastamento informado é inconsistente com as datas do documento.");
        alerts.push({
          type: "ABSENCE_PERIOD_INCONSISTENT",
          severity: "LOW",
          title: "Período de afastamento inconsistente",
          description: "A quantidade de dias informada não corresponde ao intervalo de datas do documento.",
          isClientVisible: false,
        });
      }
    }

    // --- Similarity with prior cases -----------------------------------------
    const exactMatch = input.similarityFindings.find((f) => f.matchType === "EXACT_FILE_HASH");
    if (exactMatch && input.priorInconsistentMatch) {
      score -= 30;
      negatives.push("Documento idêntico a um caso anterior com indícios de inconsistência.");
      alerts.push({
        type: "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT",
        severity: "CRITICAL",
        title: "Semelhança com caso anterior inconsistente",
        description: "Este documento é idêntico ou altamente semelhante a um caso anterior que não foi confirmado.",
        isClientVisible: false,
      });
    } else if (input.similarityFindings.length > 0 && input.priorInconsistentMatch) {
      score -= 18;
      negatives.push("Similaridade relevante com um caso anterior não confirmado.");
      alerts.push({
        type: "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT",
        severity: "HIGH",
        title: "Similaridade com caso anterior",
        description: "Foram encontradas semelhanças relevantes com um documento de caso anterior não confirmado.",
        isClientVisible: false,
      });
    } else if (input.similarityFindings.length > 0) {
      alerts.push({
        type: "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT",
        severity: "INFO",
        title: "Similaridade documental encontrada",
        description: "Foram encontradas semelhanças com outros documentos já processados, sem indícios de inconsistência.",
        isClientVisible: false,
      });
    }

    // --- Missing information --------------------------------------------
    const missingCore = !doctor?.status || !clinic?.status;
    if (missingCore) {
      alerts.push({
        type: "INSUFFICIENT_INFORMATION",
        severity: "LOW",
        title: "Informações insuficientes",
        description: "Nem todos os dados necessários para uma validação completa estão disponíveis.",
        isClientVisible: false,
      });
    }

    if (scoreCeiling !== null) score = Math.min(score, scoreCeiling);
    score = clamp(Math.round(score));
    const riskLevel = riskLevelFromScore(score);
    const hasCritical = alerts.some((a) => a.severity === "CRITICAL");
    const hasHigh = alerts.some((a) => a.severity === "HIGH");

    let recommendation: RiskScoringResult["recommendation"];
    if (hasCritical || score < 35 || (doctor?.status === "DIVERGENT" && (doctor.matchScore ?? 100) < 40)) {
      recommendation = "SUPERVISOR_REVIEW";
    } else if (
      score < 60 ||
      qr?.status === "INVALID" ||
      qr?.status === "DOMAIN_SUSPICIOUS" ||
      clinic?.status === "DIVERGENT" ||
      doctor?.status === "NOT_FOUND" ||
      doctor?.status === "DIVERGENT" ||
      hasHigh
    ) {
      recommendation = "CLINIC_CONTACT";
    } else if (
      (score >= 60 && score <= 85) ||
      (input.ocrConfidence !== null && input.ocrConfidence !== undefined && input.ocrConfidence < 85) ||
      clinic?.status === "NOT_FOUND"
    ) {
      recommendation = "HUMAN_REVIEW";
    } else if (
      doctor?.status === "VALIDATED" &&
      (clinic?.status === "VALIDATED" || qr?.status === "VALID") &&
      score > 85 &&
      !hasHigh &&
      !hasCritical
    ) {
      recommendation = "AUTO_VALIDATE";
    } else {
      recommendation = "INCONCLUSIVE";
    }

    const summary =
      recommendation === "AUTO_VALIDATE"
        ? "Médico e instituição emissora confirmados, sem indícios relevantes — documento segue para parecer com revisão rápida."
        : recommendation === "HUMAN_REVIEW"
        ? "Confiabilidade média — documento encaminhado para revisão humana antes da conclusão."
        : recommendation === "CLINIC_CONTACT"
        ? "Confiabilidade baixa ou dados divergentes — recomenda-se contato direto com a clínica/hospital emissor."
        : recommendation === "SUPERVISOR_REVIEW"
        ? "Indícios relevantes de inconsistência — caso encaminhado para revisão de supervisor."
        : "Dados insuficientes para uma conclusão — resultado inconclusivo até nova informação.";

    return {
      score,
      riskLevel,
      positiveIndicators: positives,
      negativeIndicators: negatives,
      summary,
      alerts,
      recommendation,
    };
  }
}

export const riskScoringService: RiskScoringService = new DefaultRiskScoringService();
