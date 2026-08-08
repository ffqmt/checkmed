import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";
import { recordTimelineEvent } from "@/server/timeline";
import { recordAuditLog } from "@/server/audit";
import { storageAdapter, sha256Of, buildStoragePath } from "@/server/services/storage.service";
import { STORAGE_BUCKETS } from "@/lib/supabase";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/certificate-request";
import { runCertificateValidationWorkflow } from "@/server/services/workflow";
import type { DocumentFileType } from "@prisma/client";

function fileTypeFromMime(mime: string): DocumentFileType {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpg") return "JPG";
  return "JPEG";
}

/** POST /api/v1/certificate-requests/:id/files — attaches the certificate file and kicks off the automatic validation workflow. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const { id } = await params;

    const certRequest = await prisma.medicalCertificateRequest.findUnique({ where: { id } });
    if (!certRequest || certRequest.organizationId !== organizationId) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Envie o arquivo no campo 'file' (multipart/form-data)." }, { status: 422 });
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato não suportado. Envie PDF, JPG, JPEG ou PNG." }, { status: 422 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Arquivo maior que o limite de 15MB." }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256Hash = sha256Of(buffer);
    const storagePath = buildStoragePath(id, file.name);

    await storageAdapter.upload(STORAGE_BUCKETS.certificates, storagePath, buffer, file.type);

    const uploader = await prisma.user.findFirstOrThrow({ where: { organizationId } });
    await prisma.documentFile.create({
      data: {
        requestId: id,
        storageBucket: STORAGE_BUCKETS.certificates,
        storagePath,
        originalFileName: file.name,
        fileType: fileTypeFromMime(file.type),
        mimeType: file.type,
        fileSize: file.size,
        sha256Hash,
        uploadedByUserId: uploader.id,
      },
    });

    await recordTimelineEvent({ requestId: id, eventType: "FILE_UPLOADED", title: "Documento enviado via API", isClientVisible: true });
    await recordAuditLog({ organizationId, requestId: id, action: "FILE_UPLOADED", entityType: "DocumentFile", newData: { sha256Hash } });

    runCertificateValidationWorkflow(id).catch((error) => console.error("Workflow failed", error));

    return NextResponse.json({ success: true, status: "PROCESSING" }, { status: 202 });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
