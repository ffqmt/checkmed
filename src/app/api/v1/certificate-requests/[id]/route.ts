import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const { id } = await params;

    const found = await prisma.medicalCertificateRequest.findUnique({
      where: { id },
      select: {
        id: true,
        employeeName: true,
        employeeDocumentMasked: true,
        status: true,
        priority: true,
        riskLevel: true,
        confidenceScore: true,
        finalResult: true,
        clientVisibleSummary: true,
        createdAt: true,
        completedAt: true,
        organizationId: true,
      },
    });

    if (!found || found.organizationId !== organizationId) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    const { organizationId: _omit, ...payload } = found;
    return NextResponse.json({ data: payload });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
