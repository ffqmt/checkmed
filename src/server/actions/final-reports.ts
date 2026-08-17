"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { notificationService } from "@/server/services/notification.service";
import { dispatchWebhookEvent } from "@/server/services/webhook-dispatch.service";
import { generateFinalReportSchema } from "@/lib/validations/final-report";
import { permissions } from "@/lib/rbac";
import { suggestFinalReport, type ReportSuggestionContext } from "@/server/services/adapters/claude-report-suggestion.adapter";
import type { FinalResult } from "@prisma/client";

const CONSEQUENTIAL_RESULTS: FinalResult[] = ["INCONSISTENT", "NOT_CONFIRMED", "NOT_RECOGNIZED_BY_INSTITUTION"];

/** Draft-only: gathers the same verification data an analyst already sees on the ops page and asks Claude to propose a starting point — never writes anything, never touches the request. The analyst still reviews and calls generateFinalReport themselves. */
export async function suggestFinalReportDraft(requestId: string) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Você não tem permissão para gerar sugestões de parecer.");
  }

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      riskAnalysis: { include: { alerts: true } },
      doctorVerification: true,
      clinicVerification: true,
      qrCodeVerification: true,
      technicalAnalysis: true,
      extractedData: true,
      contactAttempts: true,
      similarityMatches: true,
    },
  });

  const context: ReportSuggestionContext = {
    riskAnalysis: request.riskAnalysis
      ? {
          score: request.riskAnalysis.score,
          riskLevel: request.riskAnalysis.riskLevel,
          summary: request.riskAnalysis.summary,
          positiveIndicators: (request.riskAnalysis.positiveIndicatorsJson as string[] | null) ?? [],
          negativeIndicators: (request.riskAnalysis.negativeIndicatorsJson as string[] | null) ?? [],
          alerts: request.riskAnalysis.alerts.map((a) => ({ title: a.title, description: a.description, severity: a.severity, type: a.type })),
        }
      : null,
    doctorVerification: request.doctorVerification
      ? {
          informedDoctorName: request.doctorVerification.informedDoctorName,
          officialDoctorName: request.doctorVerification.officialDoctorName,
          informedCrm: request.doctorVerification.informedCrm,
          informedCrmUf: request.doctorVerification.informedCrmUf,
          officialCrm: request.doctorVerification.officialCrm,
          officialCrmUf: request.doctorVerification.officialCrmUf,
          registrationStatus: request.doctorVerification.registrationStatus,
          specialty: request.doctorVerification.specialty,
          status: request.doctorVerification.status,
          notes: request.doctorVerification.notes,
        }
      : null,
    clinicVerification: request.clinicVerification
      ? {
          informedClinicName: request.clinicVerification.informedClinicName,
          officialName: request.clinicVerification.officialName,
          informedCnpj: request.clinicVerification.informedCnpj,
          officialCnpj: request.clinicVerification.officialCnpj,
          officialAddress: request.clinicVerification.officialAddress,
          status: request.clinicVerification.status,
          notes: request.clinicVerification.notes,
        }
      : null,
    qrCodeVerification: request.qrCodeVerification
      ? {
          status: request.qrCodeVerification.status,
          domain: request.qrCodeVerification.domain,
          isDomainTrusted: request.qrCodeVerification.isDomainTrusted,
          httpStatus: request.qrCodeVerification.httpStatus,
          notes: request.qrCodeVerification.notes,
        }
      : null,
    technicalAnalysis: request.technicalAnalysis
      ? {
          metadataRiskScore: request.technicalAnalysis.metadataRiskScore,
          manipulationRiskScore: request.technicalAnalysis.manipulationRiskScore,
          aiGenerationRiskScore: request.technicalAnalysis.aiGenerationRiskScore,
          contentAuthenticityRiskScore: request.technicalAnalysis.contentAuthenticityRiskScore,
          compressionInconsistencyScore: request.technicalAnalysis.compressionInconsistencyScore,
          fontInconsistencyScore: request.technicalAnalysis.fontInconsistencyScore,
          layerInconsistencyScore: request.technicalAnalysis.layerInconsistencyScore,
          signatureStampInconsistencyScore: request.technicalAnalysis.signatureStampInconsistencyScore,
          externalProviderName: request.technicalAnalysis.externalProviderName,
          findings: (request.technicalAnalysis.findingsJson as { area: string; description: string; severity: string }[] | null) ?? [],
        }
      : null,
    extractedData: request.extractedData
      ? {
          doctorName: request.extractedData.doctorName,
          doctorCrm: request.extractedData.doctorCrm,
          doctorCrmUf: request.extractedData.doctorCrmUf,
          certificateIssueDate: request.extractedData.certificateIssueDate?.toISOString() ?? null,
          absenceDays: request.extractedData.absenceDays,
          absenceStartDate: request.extractedData.absenceStartDate?.toISOString() ?? null,
          absenceEndDate: request.extractedData.absenceEndDate?.toISOString() ?? null,
          clinicName: request.extractedData.clinicName,
          clinicCnpj: request.extractedData.clinicCnpj,
          clinicCnes: request.extractedData.clinicCnes,
          clinicAddress: request.extractedData.clinicAddress,
          extractionWarnings: (request.extractedData.extractionWarningsJson as string[] | null) ?? [],
          // cidCode, rawText, qrCodeContent deliberately excluded — never sent to the model.
        }
      : null,
    contactAttempts: request.contactAttempts.map((c) => ({
      contactType: c.contactType,
      contactTarget: c.contactTarget,
      result: c.result,
      attemptedAt: c.attemptedAt.toISOString(),
      contactedPersonName: c.contactedPersonName,
      contactedPersonRole: c.contactedPersonRole,
      notes: c.notes,
    })),
    similarityMatches: request.similarityMatches.map((m) => ({
      matchType: m.matchType,
      similarityScore: m.similarityScore,
      explanation: m.explanation,
    })),
  };

  try {
    const suggestion = await suggestFinalReport(context);
    await recordAuditLog({
      organizationId: request.organizationId,
      userId: session.user.id,
      requestId,
      action: "FINAL_REPORT_AI_SUGGESTION_GENERATED",
      entityType: "MedicalCertificateRequest",
      entityId: requestId,
    });
    return { success: true, ...suggestion };
  } catch (error) {
    console.error("Falha ao gerar sugestão de parecer por IA", error);
    return { error: "Não foi possível gerar a sugestão agora. Você pode escrever o parecer manualmente." };
  }
}

export async function generateFinalReport(input: unknown) {
  const session = await auth();
  if (!session?.user || !permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Você não tem permissão para emitir parecer.");
  }

  const parsed = generateFinalReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({
    where: { id: data.requestId },
    include: {
      riskAnalysis: true,
      doctorVerification: true,
      clinicVerification: true,
      qrCodeVerification: true,
      contactAttempts: true,
    },
  });

  const requiresSupervisorApproval =
    request.status === "SUPERVISOR_REVIEW" ||
    (session.user.role === "INTERNAL_ANALYST" && CONSEQUENTIAL_RESULTS.includes(data.result));

  const report = await prisma.finalReport.create({
    data: {
      requestId: data.requestId,
      result: data.result,
      confidenceScore: request.confidenceScore ?? request.riskAnalysis?.score ?? 50,
      riskLevel: request.riskLevel ?? request.riskAnalysis?.riskLevel ?? "MEDIUM",
      executiveSummary: data.executiveSummary,
      methodsUsedJson: {
        ocr: true,
        doctorVerification: Boolean(request.doctorVerification),
        clinicVerification: Boolean(request.clinicVerification),
        qrCodeVerification: request.qrCodeVerification?.status !== "NOT_PRESENT",
        technicalAnalysis: true,
        documentSimilarity: true,
        clinicContactAttempts: request.contactAttempts.length,
      },
      verifiedDataJson: {
        doctor: request.doctorVerification
          ? { status: request.doctorVerification.status, matchScore: request.doctorVerification.matchScore }
          : null,
        clinic: request.clinicVerification
          ? { status: request.clinicVerification.status, matchScore: request.clinicVerification.matchScore }
          : null,
      },
      evidenceSummaryJson: {
        contactAttempts: request.contactAttempts.map((c) => ({ type: c.contactType, result: c.result })),
      },
      limitations: data.limitations,
      clientVisibleNotes: data.clientVisibleNotes,
      internalNotes: data.internalNotes,
      generatedByUserId: session.user.id,
      approvedByUserId: requiresSupervisorApproval ? null : session.user.id,
      approvedAt: requiresSupervisorApproval ? null : new Date(),
    },
  });

  await recordTimelineEvent({
    requestId: data.requestId,
    userId: session.user.id,
    eventType: "FINAL_REPORT_GENERATED",
    title: requiresSupervisorApproval ? "Parecer emitido — aguardando aprovação de supervisor" : "Parecer final emitido",
    isClientVisible: true,
  });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId: data.requestId,
    action: "FINAL_REPORT_GENERATED",
    entityType: "FinalReport",
    entityId: report.id,
    newData: { result: data.result, requiresSupervisorApproval },
  });

  if (requiresSupervisorApproval) {
    await prisma.medicalCertificateRequest.update({ where: { id: data.requestId }, data: { status: "SUPERVISOR_REVIEW" } });
  } else {
    await finalizeRequest(data.requestId, data.result);
  }

  revalidatePath(`/ops/requests/${data.requestId}`);
  revalidatePath(`/app/requests/${data.requestId}`);
  return { success: true, reportId: report.id, requiresSupervisorApproval };
}

export async function approveFinalReport(reportId: string) {
  const session = await auth();
  if (!session?.user || !permissions.approveSupervisorReview(session.user.role)) {
    throw new Error("Você não tem permissão para aprovar este parecer.");
  }

  const report = await prisma.finalReport.update({
    where: { id: reportId },
    data: { approvedByUserId: session.user.id, approvedAt: new Date() },
  });

  await recordTimelineEvent({
    requestId: report.requestId,
    userId: session.user.id,
    eventType: "FINAL_REPORT_GENERATED",
    title: "Parecer aprovado por supervisor",
    isClientVisible: true,
  });
  await recordAuditLog({
    userId: session.user.id,
    requestId: report.requestId,
    action: "FINAL_REPORT_APPROVED",
    entityType: "FinalReport",
    entityId: report.id,
  });

  await finalizeRequest(report.requestId, report.result);

  revalidatePath(`/ops/requests/${report.requestId}`);
  revalidatePath(`/app/requests/${report.requestId}`);
  return { success: true };
}

async function finalizeRequest(requestId: string, result: FinalResult) {
  const request = await prisma.medicalCertificateRequest.update({
    where: { id: requestId },
    data: {
      status: result,
      finalResult: result,
      completedAt: new Date(),
      clientVisibleSummary: clientSummaryFor(result),
    },
    include: { submittedBy: true },
  });

  await recordTimelineEvent({
    requestId,
    eventType: "REQUEST_COMPLETED",
    title: "Solicitação concluída",
    isClientVisible: true,
  });

  await notificationService.notify({
    organizationId: request.organizationId,
    requestId,
    userId: request.submittedByUserId,
    event: CONSEQUENTIAL_RESULTS.includes(result) ? "INCONSISTENCY" : "COMPLETED",
    toPhone: request.submittedBy.phone,
  });
  await dispatchWebhookEvent(
    request.organizationId,
    CONSEQUENTIAL_RESULTS.includes(result) ? "request.inconsistent" : "request.completed",
    { requestId, result },
    requestId,
  );
}

function clientSummaryFor(result: FinalResult) {
  switch (result) {
    case "VALIDATED":
      return "Documento confirmado pela instituição emissora.";
    case "VALIDATED_WITH_REMARKS":
      return "Documento confirmado, com ressalvas descritas no parecer.";
    case "INCONCLUSIVE":
      return "Validação inconclusiva — dados insuficientes para uma conclusão.";
    case "INCONSISTENT":
      return "Foram identificados indícios de inconsistência no documento.";
    case "NOT_CONFIRMED":
      return "Não foi possível confirmar o documento junto às fontes consultadas.";
    case "NOT_RECOGNIZED_BY_INSTITUTION":
      return "A instituição emissora não reconheceu a emissão deste documento.";
  }
}
