import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";
import { recordTimelineEvent } from "@/server/timeline";
import { recordAuditLog } from "@/server/audit";
import { dispatchWebhookEvent } from "@/server/services/webhook-dispatch.service";
import { maskCpf } from "@/lib/masking";

const bodySchema = z.object({
  employeeName: z.string().min(3),
  employeeDocument: z.string().min(11),
  employeeRegistration: z.string().optional(),
  employeeEmail: z.string().email().optional(),
  receivedByCompanyAt: z.coerce.date(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  consentOrLegalBasis: z.string().min(1),
  treatmentPurpose: z.string().min(1),
});

/**
 * POST /api/v1/certificate-requests — creates a request without a file
 * (attach the document via POST /api/v1/certificate-requests/:id/files,
 * which is what actually kicks off the validation workflow).
 * GET  /api/v1/certificate-requests — lists requests for the authenticated organization.
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
    }
    const data = parsed.data;

    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const systemUser =
      (await prisma.user.findFirst({ where: { organizationId, role: "CLIENT_ADMIN" } })) ??
      (await prisma.user.findFirst({ where: { organizationId } }));
    if (!systemUser) return NextResponse.json({ error: "Organização sem usuários cadastrados." }, { status: 409 });

    const created = await prisma.medicalCertificateRequest.create({
      data: {
        organizationId,
        submittedByUserId: systemUser.id,
        employeeName: data.employeeName,
        employeeDocumentMasked: maskCpf(data.employeeDocument),
        employeeRegistration: data.employeeRegistration,
        employeeEmail: data.employeeEmail,
        receivedByCompanyAt: data.receivedByCompanyAt,
        submissionChannel: "API",
        priority: data.priority,
        status: "RECEIVED",
        slaDueAt: new Date(Date.now() + organization.slaHours * 3600 * 1000),
        consentOrLegalBasis: data.consentOrLegalBasis,
        treatmentPurpose: data.treatmentPurpose,
        retentionUntil: new Date(Date.now() + organization.dataRetentionDays * 86400 * 1000),
      },
    });

    await recordTimelineEvent({ requestId: created.id, eventType: "REQUEST_CREATED", title: "Solicitação criada via API", isClientVisible: true });
    await recordAuditLog({
      organizationId,
      requestId: created.id,
      action: "REQUEST_CREATED",
      entityType: "MedicalCertificateRequest",
      entityId: created.id,
      newData: { source: "api" },
    });
    await dispatchWebhookEvent(organizationId, "request.received", { requestId: created.id }, created.id);

    return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const requests = await prisma.medicalCertificateRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        employeeName: true,
        status: true,
        priority: true,
        riskLevel: true,
        confidenceScore: true,
        finalResult: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
