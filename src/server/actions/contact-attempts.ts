"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { notificationService } from "@/server/services/notification.service";
import { createContactAttemptSchema } from "@/lib/validations/contact-attempt";
import { permissions } from "@/lib/rbac";
import { storageAdapter, buildStoragePath, type SignedUploadTarget } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/certificate-request";
import type { DocumentFileType } from "@prisma/client";

const MAX_CONTACT_ATTEMPTS = 3;

function fileTypeFromMime(mime: string): DocumentFileType {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpg") return "JPG";
  return "JPEG";
}

export type BeginEvidenceUploadResult = { error: string } | { uploadTarget: SignedUploadTarget; storagePath: string };

/** Same direct-to-storage pattern as the certificate upload — a screenshot can be a few MB, no reason to risk the same Vercel body-size failure twice. */
export async function beginEvidenceUpload(
  requestId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
): Promise<BeginEvidenceUploadResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Você não tem permissão para anexar evidências.");
  }

  if (!ACCEPTED_FILE_TYPES.includes(mimeType)) {
    return { error: "Formato não suportado. Envie PDF, JPG, JPEG ou PNG." };
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite permitido de 15MB." };
  }

  const storagePath = buildStoragePath(requestId, fileName);
  const uploadTarget = await storageAdapter.createSignedUploadUrl(STORAGE_BUCKETS.evidence, storagePath, 300);
  return { uploadTarget, storagePath };
}

export async function createContactAttempt(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");
  if (!permissions.reviewAsAnalyst(session.user.role)) {
    throw new Error("Você não tem permissão para registrar contatos.");
  }

  const parsed = createContactAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: data.requestId } });

  let evidenceFileId: string | undefined;
  if (data.evidence) {
    const evidenceFile = await prisma.documentFile.create({
      data: {
        requestId: data.requestId,
        storageBucket: STORAGE_BUCKETS.evidence,
        storagePath: data.evidence.storagePath,
        originalFileName: data.evidence.fileName,
        fileType: fileTypeFromMime(data.evidence.mimeType),
        mimeType: data.evidence.mimeType,
        fileSize: data.evidence.fileSize,
        sha256Hash: data.evidence.sha256Hash,
        uploadedByUserId: session.user.id,
      },
    });
    evidenceFileId = evidenceFile.id;
  }

  const attempt = await prisma.contactAttempt.create({
    data: {
      requestId: data.requestId,
      contactType: data.contactType,
      contactTarget: data.contactTarget,
      contactValue: data.contactValue,
      attemptedAt: data.attemptedAt,
      responsibleUserId: session.user.id,
      contactedPersonName: data.contactedPersonName,
      contactedPersonRole: data.contactedPersonRole,
      result: data.result,
      notes: data.notes,
      isClientVisible: data.isClientVisible,
      evidenceFileId,
    },
  });

  await recordTimelineEvent({
    requestId: data.requestId,
    userId: session.user.id,
    eventType: "CONTACT_ATTEMPT_REGISTERED",
    title: "Contato com a clínica/hospital registrado",
    description: contactResultLabel(data.result),
    isClientVisible: data.isClientVisible,
  });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId: data.requestId,
    action: "CONTACT_ATTEMPT_REGISTERED",
    entityType: "ContactAttempt",
    entityId: attempt.id,
    newData: { result: data.result, contactType: data.contactType },
  });

  await applyContactOutcome(data.requestId, data.result);

  revalidatePath(`/ops/requests/${data.requestId}`);
  revalidatePath(`/app/requests/${data.requestId}`);
  return { success: true };
}

async function applyContactOutcome(requestId: string, result: string) {
  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { submittedBy: true },
  });

  if (result === "CONFIRMED_ISSUANCE") {
    await prisma.medicalCertificateRequest.update({
      where: { id: requestId },
      data: { status: "CLINIC_CONTACTED" },
    });
    await recordTimelineEvent({
      requestId,
      eventType: "STATUS_CHANGED",
      title: "Emissão confirmada pela instituição — aguardando parecer",
      isClientVisible: true,
    });
    return;
  }

  if (result === "DENIED_ISSUANCE") {
    await prisma.medicalCertificateRequest.update({
      where: { id: requestId },
      data: { status: "SUPERVISOR_REVIEW" },
    });
    await recordTimelineEvent({
      requestId,
      eventType: "SUPERVISOR_REVIEW_STARTED",
      title: "Instituição não reconheceu a emissão — encaminhado para supervisor",
      isClientVisible: true,
    });
    await notificationService.notify({
      organizationId: request.organizationId,
      requestId,
      event: "INCONSISTENCY",
      toPhone: request.submittedBy.phone,
      toEmail: request.submittedBy.email,
    });
    return;
  }

  const totalAttempts = await prisma.contactAttempt.count({ where: { requestId } });

  if (["NO_RESPONSE", "CALL_BACK_LATER", "REQUESTED_PATIENT_AUTHORIZATION"].includes(result)) {
    if (totalAttempts >= MAX_CONTACT_ATTEMPTS) {
      await concludeAsInconclusive(requestId, "A instituição emissora não respondeu após múltiplas tentativas de contato.");
      return;
    }
    await prisma.medicalCertificateRequest.update({ where: { id: requestId }, data: { status: "WAITING_EXTERNAL_RESPONSE" } });
    await recordTimelineEvent({ requestId, eventType: "STATUS_CHANGED", title: "Aguardando retorno da instituição emissora", isClientVisible: true });
    return;
  }

  // NOT_FOUND, INVALID_CONTACT, OTHER — try again unless attempts exhausted
  if (totalAttempts >= MAX_CONTACT_ATTEMPTS) {
    await concludeAsInconclusive(requestId, "Não foi possível concluir o contato com a instituição emissora após múltiplas tentativas.");
    return;
  }
  await prisma.medicalCertificateRequest.update({ where: { id: requestId }, data: { status: "WAITING_CLINIC_CONTACT" } });
}

async function concludeAsInconclusive(requestId: string, reason: string) {
  await prisma.medicalCertificateRequest.update({
    where: { id: requestId },
    data: {
      status: "INCONCLUSIVE",
      finalResult: "INCONCLUSIVE",
      completedAt: new Date(),
      clientVisibleSummary: "Validação inconclusiva — não foi possível confirmar os dados junto à instituição emissora.",
    },
  });
  await recordTimelineEvent({ requestId, eventType: "REQUEST_COMPLETED", title: "Validação inconclusiva", description: reason, isClientVisible: true });
}

function contactResultLabel(result: string) {
  const labels: Record<string, string> = {
    CONFIRMED_ISSUANCE: "Emissão confirmada pela instituição",
    DENIED_ISSUANCE: "Instituição não reconheceu a emissão",
    NOT_FOUND: "Contato não localizado",
    REQUESTED_PATIENT_AUTHORIZATION: "Instituição solicitou autorização do paciente",
    NO_RESPONSE: "Sem resposta da instituição",
    INVALID_CONTACT: "Canal de contato inválido",
    CALL_BACK_LATER: "Instituição solicitou novo contato posterior",
    OTHER: "Outro resultado registrado",
  };
  return labels[result] ?? result;
}
