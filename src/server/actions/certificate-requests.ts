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
import { storageAdapter, sha256Of, buildStoragePath } from "@/server/services/storage.service";
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

export async function createCertificateRequest(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user || !session.user.organizationId) {
    throw new Error("Sessão inválida.");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Selecione um arquivo para enviar." };
  }
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return { error: "Formato de arquivo não suportado. Envie PDF, JPG, JPEG ou PNG." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256Hash = sha256Of(buffer);
  const storagePath = buildStoragePath(request.id, file.name);

  await storageAdapter.upload(STORAGE_BUCKETS.certificates, storagePath, buffer, file.type);

  await prisma.documentFile.create({
    data: {
      requestId: request.id,
      storageBucket: STORAGE_BUCKETS.certificates,
      storagePath,
      originalFileName: file.name,
      fileType: fileTypeFromMime(file.type),
      mimeType: file.type,
      fileSize: file.size,
      sha256Hash,
      uploadedByUserId: session.user.id,
    },
  });

  await recordTimelineEvent({
    requestId: request.id,
    userId: session.user.id,
    eventType: "FILE_UPLOADED",
    title: "Documento enviado",
    description: file.name,
    isClientVisible: true,
  });
  await recordTimelineEvent({
    requestId: request.id,
    eventType: "FILE_HASH_CALCULATED",
    title: "Hash do arquivo calculado",
    isClientVisible: false,
    metadata: { sha256Hash },
  });
  await recordAuditLog({
    organizationId: organization.id,
    userId: session.user.id,
    requestId: request.id,
    action: "FILE_UPLOADED",
    entityType: "DocumentFile",
    newData: { originalFileName: file.name, sha256Hash },
  });

  await notificationService.notify({
    organizationId: organization.id,
    requestId: request.id,
    userId: session.user.id,
    event: "REQUEST_RECEIVED",
  });
  await dispatchWebhookEvent(organization.id, "request.received", { requestId: request.id, employeeName: data.employeeName }, request.id);

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
