"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit";
import { recordTimelineEvent } from "@/server/timeline";
import { notificationService } from "@/server/services/notification.service";
import { dispatchWebhookEvent } from "@/server/services/webhook-dispatch.service";
import { runCertificateValidationWorkflow } from "@/server/services/workflow";
import { storageAdapter, buildStoragePath, type SignedUploadTarget } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import {
  createCertificateRequestSchema,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/validations/certificate-request";
import { maskCpf } from "@/lib/masking";
import type { DocumentFileType } from "@prisma/client";

function fileTypeFromMime(mime: string): DocumentFileType {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpg") return "JPG";
  return "JPEG";
}

export type BeginUploadResult =
  | { error: string }
  | { requestId: string; uploadTarget: SignedUploadTarget; fileName: string; mimeType: string; fileSize: number };

/**
 * Step 1 of 2: validates the form and the file's *metadata* only (name,
 * type, size — never the bytes), creates the request record, and returns a
 * short-lived upload target. The browser uploads the file directly to
 * storage from there — the file body never passes through this server
 * action, which matters because Vercel caps a Serverless Function's request
 * body at 4.5MB with no way to raise it, well under a real phone photo.
 */
export async function beginCertificateRequestUpload(formData: FormData): Promise<BeginUploadResult> {
  const session = await auth();
  if (!session?.user || !session.user.organizationId) {
    throw new Error("Sessão inválida.");
  }

  const fileName = String(formData.get("fileName") ?? "");
  const mimeType = String(formData.get("fileMimeType") ?? "");
  const fileSize = Number(formData.get("fileSize") ?? 0);

  if (!fileName || !fileSize) {
    return { error: "Selecione um arquivo para enviar." };
  }
  if (!ACCEPTED_FILE_TYPES.includes(mimeType)) {
    return { error: "Formato de arquivo não suportado. Envie PDF, JPG, JPEG ou PNG." };
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite permitido de 15MB." };
  }

  const parsed = createCertificateRequestSchema.safeParse({
    employeeName: formData.get("employeeName"),
    employeeDocument: formData.get("employeeDocument"),
    employeeRegistration: formData.get("employeeRegistration") || undefined,
    employeeEmail: formData.get("employeeEmail") || undefined,
    receivedByCompanyAt: formData.get("receivedByCompanyAt"),
    priority: formData.get("priority") || "NORMAL",
    consentOrLegalBasis: formData.get("consentOrLegalBasis"),
    treatmentPurpose: formData.get("treatmentPurpose"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: session.user.organizationId } });

  const request = await prisma.medicalCertificateRequest.create({
    data: {
      organizationId: organization.id,
      submittedByUserId: session.user.id,
      employeeName: data.employeeName,
      employeeDocumentMasked: maskCpf(data.employeeDocument),
      employeeRegistration: data.employeeRegistration || null,
      employeeEmail: data.employeeEmail || null,
      receivedByCompanyAt: data.receivedByCompanyAt,
      submissionChannel: "WEB_UPLOAD",
      priority: data.priority,
      status: "RECEIVED",
      slaDueAt: new Date(Date.now() + organization.slaHours * 3600 * 1000),
      consentOrLegalBasis: data.consentOrLegalBasis,
      treatmentPurpose: data.treatmentPurpose,
      retentionUntil: new Date(Date.now() + organization.dataRetentionDays * 86400 * 1000),
    },
  });

  await recordTimelineEvent({
    requestId: request.id,
    userId: session.user.id,
    eventType: "REQUEST_CREATED",
    title: "Solicitação criada",
    isClientVisible: true,
  });
  await recordAuditLog({
    organizationId: organization.id,
    userId: session.user.id,
    requestId: request.id,
    action: "REQUEST_CREATED",
    entityType: "MedicalCertificateRequest",
    entityId: request.id,
    newData: { employeeName: data.employeeName },
  });

  const storagePath = buildStoragePath(request.id, fileName);
  const uploadTarget = await storageAdapter.createSignedUploadUrl(STORAGE_BUCKETS.certificates, storagePath, 300);

  return { requestId: request.id, uploadTarget, fileName, mimeType, fileSize };
}

/**
 * Step 2 of 2: called by the browser after it has uploaded the file bytes
 * directly to storage. Creates the DocumentFile record from the already-
 * known metadata + the storage path baked into the upload target, then runs
 * the validation workflow exactly as before.
 */
export async function finalizeCertificateRequestUpload(input: {
  requestId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
}) {
  const session = await auth();
  if (!session?.user || !session.user.organizationId) {
    throw new Error("Sessão inválida.");
  }

  const request = await prisma.medicalCertificateRequest.findUniqueOrThrow({ where: { id: input.requestId } });
  if (request.organizationId !== session.user.organizationId) {
    throw new Error("Solicitação não encontrada.");
  }

  await prisma.documentFile.create({
    data: {
      requestId: request.id,
      storageBucket: STORAGE_BUCKETS.certificates,
      storagePath: input.storagePath,
      originalFileName: input.fileName,
      fileType: fileTypeFromMime(input.mimeType),
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      sha256Hash: input.sha256Hash,
      uploadedByUserId: session.user.id,
    },
  });

  await recordTimelineEvent({
    requestId: request.id,
    userId: session.user.id,
    eventType: "FILE_UPLOADED",
    title: "Documento enviado",
    description: input.fileName,
    isClientVisible: true,
  });
  await recordTimelineEvent({
    requestId: request.id,
    eventType: "FILE_HASH_CALCULATED",
    title: "Hash do arquivo calculado",
    isClientVisible: false,
    metadata: { sha256Hash: input.sha256Hash },
  });
  await recordAuditLog({
    organizationId: request.organizationId,
    userId: session.user.id,
    requestId: request.id,
    action: "FILE_UPLOADED",
    entityType: "DocumentFile",
    newData: { originalFileName: input.fileName, sha256Hash: input.sha256Hash },
  });

  await notificationService.notify({
    organizationId: request.organizationId,
    requestId: request.id,
    userId: session.user.id,
    event: "REQUEST_RECEIVED",
  });
  await dispatchWebhookEvent(
    request.organizationId,
    "request.received",
    { requestId: request.id, employeeName: request.employeeName },
    request.id,
  );

  try {
    await runCertificateValidationWorkflow(request.id);
  } catch (error) {
    console.error("Workflow failed", error);
    await recordTimelineEvent({
      requestId: request.id,
      eventType: "STATUS_CHANGED",
      title: "Falha no processamento automático",
      description: (error as Error).message,
      isClientVisible: false,
    });
  }

  revalidatePath("/app/requests");
  redirect(`/app/requests/${request.id}`);
}
