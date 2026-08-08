import { prisma } from "@/lib/prisma";
import { recordTimelineEvent } from "@/server/timeline";
import { recordAuditLog } from "@/server/audit";
import { assignLeastBusyUser } from "@/server/assignment";
import { notificationService } from "./notification.service";
import { dispatchWebhookEvent } from "./webhook-dispatch.service";
import { ocrService } from "./ocr.service";
import { extractionService } from "./extraction.service";
import { doctorRegistryService } from "./doctor-registry.service";
import { clinicRegistryService } from "./clinic-registry.service";
import { qrCodeVerificationService } from "./qrcode.service";
import { documentForensicsService } from "./forensics.service";
import { documentSimilarityService } from "./similarity.service";
import { riskScoringService } from "./risk-scoring.service";
import { storageAdapter } from "./storage.service";
import type { RequestStatus } from "@prisma/client";

/**
 * CertificateValidationWorkflow — orchestrates the automatic pipeline
 * described in spec section 18. Each stage persists its own result table,
 * appends a timeline event, and updates MedicalCertificateRequest.status
 * before moving on. Today this runs inline inside the Route Handler that
 * triggers it (see /api/internal/requests/[id]/process); to move to a
 * real queue (Inngest/Trigger.dev/BullMQ/QStash), wrap this same function
 * body as the job handler and enqueue it instead of calling it directly.
 */
export async function runCertificateValidationWorkflow(requestId: string): Promise<void> {
  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { documents: { orderBy: { createdAt: "desc" }, take: 1 }, organization: true, submittedBy: true },
  });

  const file = request.documents[0];
  if (!file) throw new Error("Nenhum documento anexado à solicitação.");

  await setStatus(requestId, "PROCESSING");
  await notificationService.notify({
    organizationId: request.organizationId,
    requestId,
    userId: request.submittedByUserId,
    event: "PROCESSING_STARTED",
    toPhone: request.employeeEmail ? null : undefined,
  });
  await dispatchWebhookEvent(request.organizationId, "request.processing_started", { requestId }, requestId);

  const buffer = await storageAdapter.download(file.storageBucket, file.storagePath);

  // 1. OCR ----------------------------------------------------------------
  await setStatus(requestId, "OCR_RUNNING");
  await recordTimelineEvent({ requestId, eventType: "OCR_STARTED", title: "Leitura do documento iniciada", isClientVisible: false });

  const ocrResult = await ocrService.extractText({ buffer, mimeType: file.mimeType });

  await setStatus(requestId, "OCR_COMPLETED");
  await recordTimelineEvent({
    requestId,
    eventType: "OCR_COMPLETED",
    title: "Leitura do documento concluída",
    description: `Confiança de leitura: ${ocrResult.confidence}%`,
    isClientVisible: false,
    metadata: { confidence: ocrResult.confidence, warnings: ocrResult.warnings },
  });

  // 2. Structured extraction ------------------------------------------------
  const structured = await extractionService.extractStructuredData(ocrResult.rawText, { mimeType: file.mimeType });

  await prisma.extractedData.create({
    data: {
      requestId,
      rawText: ocrResult.rawText,
      doctorName: structured.doctorName,
      doctorCrm: structured.doctorCrm,
      doctorCrmUf: structured.doctorCrmUf,
      certificateIssueDate: structured.certificateIssueDate,
      absenceDays: structured.absenceDays,
      absenceStartDate: structured.absenceStartDate,
      absenceEndDate: structured.absenceEndDate,
      clinicName: structured.clinicName,
      clinicCnpj: structured.clinicCnpj,
      clinicCnes: structured.clinicCnes,
      clinicAddress: structured.clinicAddress,
      clinicPhone: structured.clinicPhone,
      clinicEmail: structured.clinicEmail,
      cidCode: structured.cidCode,
      qrCodeContent: structured.qrCodeContent,
      authenticationUrl: structured.authenticationUrl,
      confidenceJson: structured.confidence,
      extractionWarningsJson: structured.warnings,
    },
  });

  await setStatus(requestId, "DATA_EXTRACTED");
  await recordTimelineEvent({
    requestId,
    eventType: "DATA_EXTRACTED",
    title: "Dados do documento extraídos",
    isClientVisible: true,
    metadata: { warnings: structured.warnings },
  });

  await setStatus(requestId, "AUTO_VALIDATION_RUNNING");

  // 3. Doctor + clinic verification (parallel) -------------------------------
  await recordTimelineEvent({ requestId, eventType: "DOCTOR_VERIFICATION_STARTED", title: "Validação do médico iniciada" });
  await recordTimelineEvent({ requestId, eventType: "CLINIC_VERIFICATION_STARTED", title: "Validação da clínica iniciada" });

  const [doctorResult, clinicResult] = await Promise.all([
    doctorRegistryService.verifyDoctor(structured.doctorName, structured.doctorCrm, structured.doctorCrmUf),
    clinicRegistryService.verifyClinic({
      clinicName: structured.clinicName,
      cnpj: structured.clinicCnpj,
      cnes: structured.clinicCnes,
      address: structured.clinicAddress,
      phone: structured.clinicPhone,
      email: structured.clinicEmail,
    }),
  ]);

  await prisma.doctorVerification.create({
    data: {
      requestId,
      informedDoctorName: structured.doctorName,
      informedCrm: structured.doctorCrm,
      informedCrmUf: structured.doctorCrmUf,
      officialDoctorName: doctorResult.officialDoctorName,
      officialCrm: doctorResult.officialCrm,
      officialCrmUf: doctorResult.officialCrmUf,
      registrationStatus: doctorResult.registrationStatus,
      specialty: doctorResult.specialty,
      sourceName: doctorResult.sourceName,
      sourceUrl: doctorResult.sourceUrl,
      matchScore: doctorResult.matchScore,
      status: doctorResult.status,
      checkedAt: new Date(),
      rawResponseJson: doctorResult.rawResponse,
      notes: doctorResult.notes,
    },
  });
  await recordTimelineEvent({
    requestId,
    eventType: "DOCTOR_VERIFICATION_COMPLETED",
    title: "Validação do médico concluída",
    description: describeVerification(doctorResult.status),
    isClientVisible: true,
  });

  await prisma.clinicVerification.create({
    data: {
      requestId,
      informedClinicName: structured.clinicName,
      informedCnpj: structured.clinicCnpj,
      informedCnes: structured.clinicCnes,
      informedAddress: structured.clinicAddress,
      informedPhone: structured.clinicPhone,
      informedEmail: structured.clinicEmail,
      officialName: clinicResult.officialName,
      officialCnpj: clinicResult.officialCnpj,
      officialCnes: clinicResult.officialCnes,
      officialAddress: clinicResult.officialAddress,
      officialPhone: clinicResult.officialPhone,
      officialEmail: clinicResult.officialEmail,
      website: clinicResult.website,
      sourceName: clinicResult.sourceName,
      sourceUrl: clinicResult.sourceUrl,
      matchScore: clinicResult.matchScore,
      status: clinicResult.status,
      checkedAt: new Date(),
      rawResponseJson: clinicResult.rawResponse,
      notes: clinicResult.notes,
    },
  });
  await recordTimelineEvent({
    requestId,
    eventType: "CLINIC_VERIFICATION_COMPLETED",
    title: "Validação da clínica concluída",
    description: describeVerification(clinicResult.status),
    isClientVisible: true,
  });

  // 4. QR Code / authentication link -----------------------------------------
  let qrStatus: Awaited<ReturnType<typeof qrCodeVerificationService.validateAuthenticationUrl>> | null = null;
  let qrOutcome: Awaited<ReturnType<typeof qrCodeVerificationService.comparePageDataWithExtractedData>> | null = null;

  if (structured.authenticationUrl) {
    qrStatus = await qrCodeVerificationService.validateAuthenticationUrl(structured.authenticationUrl);
    qrOutcome = await qrCodeVerificationService.comparePageDataWithExtractedData(qrStatus.extractedPageData, {});
    await prisma.qrCodeVerification.create({
      data: {
        requestId,
        qrCodeContent: structured.qrCodeContent,
        authenticationUrl: structured.authenticationUrl,
        domain: qrStatus.domain,
        isDomainTrusted: qrStatus.isDomainTrusted,
        httpStatus: qrStatus.httpStatus,
        extractedPageDataJson: qrStatus.extractedPageData ?? undefined,
        matchScore: qrOutcome.matchScore,
        status: !qrStatus.isDomainTrusted ? "DOMAIN_SUSPICIOUS" : qrOutcome.status,
        checkedAt: new Date(),
        notes: qrOutcome.notes,
      },
    });
  } else {
    await prisma.qrCodeVerification.create({
      data: { requestId, status: "NOT_PRESENT" },
    });
  }
  await recordTimelineEvent({ requestId, eventType: "QR_CODE_VERIFICATION_COMPLETED", title: "Verificação de QR Code concluída", isClientVisible: false });

  // 5. Technical / forensic analysis ------------------------------------------
  const findings = await documentForensicsService.produceTechnicalFindings({ buffer, mimeType: file.mimeType });
  await prisma.technicalAnalysis.create({
    data: {
      requestId,
      metadataRiskScore: findings.metadataRiskScore,
      manipulationRiskScore: findings.manipulationRiskScore,
      aiGenerationRiskScore: findings.aiGenerationRiskScore,
      compressionInconsistencyScore: findings.compressionInconsistencyScore,
      fontInconsistencyScore: findings.fontInconsistencyScore,
      layerInconsistencyScore: findings.layerInconsistencyScore,
      signatureStampInconsistencyScore: findings.signatureStampInconsistencyScore,
      findingsJson: findings.findings,
      status: findings.status,
      analyzedAt: new Date(),
      externalProviderName: findings.externalProviderName ?? undefined,
      externalProviderResponseJson: findings.externalProviderResponseJson ?? undefined,
    },
  });
  await recordTimelineEvent({ requestId, eventType: "TECHNICAL_ANALYSIS_COMPLETED", title: "Análise técnica do arquivo concluída", isClientVisible: false });

  // 6. Fingerprint + similarity -----------------------------------------------
  const fingerprint = await documentSimilarityService.generateFingerprint({ buffer }, ocrResult.rawText);
  await prisma.documentFingerprint.create({
    data: {
      requestId,
      fileHash: file.sha256Hash,
      perceptualHash: fingerprint.perceptualHash,
      layoutHash: fingerprint.layoutHash,
      textHash: fingerprint.textHash,
      stampHash: fingerprint.stampHash,
      signatureHash: fingerprint.signatureHash,
      normalizedText: fingerprint.normalizedText,
    },
  });
  await recordTimelineEvent({ requestId, eventType: "FINGERPRINT_GENERATED", title: "Fingerprint documental gerado", isClientVisible: false });

  const similarityFindings = await documentSimilarityService.findSimilarDocuments(requestId, fingerprint);
  if (similarityFindings.length > 0) {
    await prisma.similarityMatch.createMany({
      data: similarityFindings.map((f) => ({
        requestId,
        matchedRequestId: f.matchedRequestId,
        matchType: f.matchType,
        similarityScore: f.similarityScore,
        explanation: f.explanation,
      })),
    });
  }
  await recordTimelineEvent({ requestId, eventType: "SIMILARITY_CHECK_COMPLETED", title: "Verificação de similaridade concluída", isClientVisible: false });

  let priorInconsistentMatch = false;
  if (similarityFindings.length > 0) {
    const matchedRequests = await prisma.medicalCertificateRequest.findMany({
      where: { id: { in: similarityFindings.map((f) => f.matchedRequestId) } },
      select: { finalResult: true },
    });
    priorInconsistentMatch = matchedRequests.some((r) =>
      ["INCONSISTENT", "NOT_CONFIRMED", "NOT_RECOGNIZED_BY_INSTITUTION"].includes(r.finalResult ?? ""),
    );
  }

  // 7. Risk scoring ------------------------------------------------------------
  const risk = riskScoringService.score({
    extractedData: {
      absenceDays: structured.absenceDays,
      certificateIssueDate: structured.certificateIssueDate,
      absenceStartDate: structured.absenceStartDate,
      absenceEndDate: structured.absenceEndDate,
    },
    ocrConfidence: ocrResult.confidence,
    doctorVerification: { status: doctorResult.status, matchScore: doctorResult.matchScore },
    clinicVerification: { status: clinicResult.status, matchScore: clinicResult.matchScore },
    qrCodeVerification: structured.authenticationUrl
      ? { status: qrOutcome?.status ?? "INCONCLUSIVE", matchScore: qrOutcome?.matchScore ?? null }
      : { status: "NOT_PRESENT", matchScore: null },
    technicalAnalysis: findings,
    similarityFindings,
    priorInconsistentMatch,
  });

  const riskAnalysis = await prisma.riskAnalysis.create({
    data: {
      requestId,
      score: risk.score,
      riskLevel: risk.riskLevel,
      positiveIndicatorsJson: risk.positiveIndicators,
      negativeIndicatorsJson: risk.negativeIndicators,
      summary: risk.summary,
    },
  });
  if (risk.alerts.length > 0) {
    await prisma.riskAlert.createMany({
      data: risk.alerts.map((a) => ({
        riskAnalysisId: riskAnalysis.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        description: a.description,
        isClientVisible: a.isClientVisible,
      })),
    });
  }
  await recordTimelineEvent({
    requestId,
    eventType: "RISK_SCORE_CALCULATED",
    title: "Score de confiabilidade calculado",
    description: risk.summary,
    isClientVisible: true,
    metadata: { score: risk.score, riskLevel: risk.riskLevel },
  });

  await recordAuditLog({
    organizationId: request.organizationId,
    requestId,
    action: "RISK_SCORE_CALCULATED",
    entityType: "RiskAnalysis",
    entityId: riskAnalysis.id,
    newData: { score: risk.score, riskLevel: risk.riskLevel, recommendation: risk.recommendation },
  });

  // 8. Automatic decision -------------------------------------------------------
  await applyDecision(requestId, risk.recommendation, risk.score, risk.riskLevel, risk.summary);
}

async function setStatus(requestId: string, status: RequestStatus) {
  await prisma.medicalCertificateRequest.update({ where: { id: requestId }, data: { status } });
  await recordTimelineEvent({
    requestId,
    eventType: "STATUS_CHANGED",
    title: `Status atualizado`,
    description: status,
    isClientVisible: false,
  });
}

function describeVerification(status: string) {
  switch (status) {
    case "VALIDATED":
      return "Dados confirmados junto à fonte consultada.";
    case "DIVERGENT":
      return "Dados informados divergem da fonte consultada.";
    case "NOT_FOUND":
      return "Nenhum registro correspondente foi localizado.";
    case "QUERY_ERROR":
      return "Fonte de consulta indisponível no momento.";
    default:
      return "Resultado inconclusivo.";
  }
}

async function applyDecision(
  requestId: string,
  recommendation: "AUTO_VALIDATE" | "HUMAN_REVIEW" | "CLINIC_CONTACT" | "SUPERVISOR_REVIEW" | "INCONCLUSIVE",
  score: number,
  riskLevel: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  summary: string,
) {
  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: requestId } });

  if (recommendation === "INCONCLUSIVE") {
    await prisma.medicalCertificateRequest.update({
      where: { id: requestId },
      data: {
        status: "INCONCLUSIVE",
        finalResult: "INCONCLUSIVE",
        confidenceScore: score,
        riskLevel,
        completedAt: new Date(),
        clientVisibleSummary: "Validação inconclusiva — dados insuficientes para uma conclusão neste momento.",
      },
    });
    await recordTimelineEvent({
      requestId,
      eventType: "REQUEST_COMPLETED",
      title: "Validação inconclusiva",
      description: summary,
      isClientVisible: true,
    });
    await notificationService.notify({
      organizationId: request.organizationId,
      requestId,
      userId: request.submittedByUserId,
      event: "INCONSISTENCY",
    });
    await dispatchWebhookEvent(request.organizationId, "request.completed", { requestId, finalResult: "INCONCLUSIVE" }, requestId);
    return;
  }

  if (recommendation === "SUPERVISOR_REVIEW") {
    const supervisorId = await assignLeastBusyUser("INTERNAL_SUPERVISOR");
    await prisma.medicalCertificateRequest.update({
      where: { id: requestId },
      data: {
        status: "SUPERVISOR_REVIEW",
        confidenceScore: score,
        riskLevel,
        supervisorUserId: supervisorId ?? undefined,
      },
    });
    await recordTimelineEvent({
      requestId,
      eventType: "SUPERVISOR_REVIEW_STARTED",
      title: "Encaminhado para revisão de supervisor",
      description: summary,
      isClientVisible: true,
    });
    await notificationService.notify({
      organizationId: request.organizationId,
      requestId,
      userId: request.submittedByUserId,
      event: "INCONSISTENCY",
    });
    await dispatchWebhookEvent(request.organizationId, "request.waiting_human_review", { requestId, reason: "supervisor_review" }, requestId);
    return;
  }

  if (recommendation === "CLINIC_CONTACT") {
    const analystId = await assignLeastBusyUser("INTERNAL_ANALYST");
    await prisma.medicalCertificateRequest.update({
      where: { id: requestId },
      data: {
        status: "WAITING_CLINIC_CONTACT",
        confidenceScore: score,
        riskLevel,
        assignedToUserId: analystId ?? undefined,
      },
    });
    await recordTimelineEvent({
      requestId,
      eventType: "STATUS_CHANGED",
      title: "Aguardando contato com a clínica/hospital emissor",
      description: summary,
      isClientVisible: true,
    });
    await notificationService.notify({
      organizationId: request.organizationId,
      requestId,
      userId: request.submittedByUserId,
      event: "WAITING_EXTERNAL_RESPONSE",
    });
    await dispatchWebhookEvent(request.organizationId, "request.waiting_external_response", { requestId }, requestId);
    return;
  }

  // AUTO_VALIDATE or HUMAN_REVIEW both land in the analyst queue — the
  // score/riskLevel badge tells the analyst how much scrutiny the case
  // still needs.
  const analystId = await assignLeastBusyUser("INTERNAL_ANALYST");
  await prisma.medicalCertificateRequest.update({
    where: { id: requestId },
    data: {
      status: "WAITING_HUMAN_REVIEW",
      confidenceScore: score,
      riskLevel,
      assignedToUserId: analystId ?? undefined,
    },
  });
  await recordTimelineEvent({
    requestId,
    eventType: "HUMAN_REVIEW_STARTED",
    title: recommendation === "AUTO_VALIDATE" ? "Encaminhado para revisão rápida" : "Encaminhado para revisão humana",
    description: summary,
    isClientVisible: true,
  });
  await dispatchWebhookEvent(request.organizationId, "request.waiting_human_review", { requestId }, requestId);
}
