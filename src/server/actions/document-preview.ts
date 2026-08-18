"use server";

import { auth } from "@/auth";
import { storageAdapter, buildPreviewStoragePath, type SignedUploadTarget } from "@/server/services/storage.service";
import { documentIntelligenceService } from "@/server/services/document-intelligence.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/certificate-request";

export type BeginPreviewUploadResult = { error: string } | { uploadTarget: SignedUploadTarget };

/**
 * Lets the new-request form upload the file the moment it's selected, before
 * the employee name/CPF fields the real request row requires are even
 * filled in yet — mirrors beginCertificateRequestUpload's signed-URL pattern
 * but with no request to attach to. See buildPreviewStoragePath.
 */
export async function beginDocumentPreviewUpload(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<BeginPreviewUploadResult> {
  const session = await auth();
  if (!session?.user || !session.user.organizationId) {
    throw new Error("Sessão inválida.");
  }

  if (!ACCEPTED_FILE_TYPES.includes(input.mimeType)) {
    return { error: "Formato de arquivo não suportado." };
  }
  if (input.fileSize > MAX_FILE_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite permitido de 15MB." };
  }

  const storagePath = buildPreviewStoragePath(input.fileName);
  const uploadTarget = await storageAdapter.createSignedUploadUrl(STORAGE_BUCKETS.certificates, storagePath, 300);
  return { uploadTarget };
}

export type PreviewExtractionResult =
  | { error: string }
  | { employeeName: string | null; employeeDocument: string | null };

/**
 * Reads the just-uploaded file with the same document-intelligence pipeline
 * the real workflow uses, purely to prefill the form — never persisted. The
 * preview copy is deleted right after; if the user submits, the file is
 * uploaded again under the real request's own storage path. Extraction
 * itself isn't repeated: document-intelligence.service.ts caches Claude
 * Vision's raw output by the file's own sha256, so the second read is free.
 */
export async function previewExtractCertificateData(input: {
  storagePath: string;
  mimeType: string;
}): Promise<PreviewExtractionResult> {
  const session = await auth();
  if (!session?.user || !session.user.organizationId) {
    throw new Error("Sessão inválida.");
  }

  try {
    const buffer = await storageAdapter.download(STORAGE_BUCKETS.certificates, input.storagePath);
    const intelligence = await documentIntelligenceService.analyze({ buffer, mimeType: input.mimeType });
    return {
      employeeName: intelligence.patientName,
      employeeDocument: intelligence.patientCpf,
    };
  } catch (error) {
    console.error("previewExtractCertificateData failed", error);
    return { error: "Não foi possível ler os dados do documento automaticamente." };
  } finally {
    await storageAdapter.remove(STORAGE_BUCKETS.certificates, input.storagePath).catch(() => {});
  }
}
