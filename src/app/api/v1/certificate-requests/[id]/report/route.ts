import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const { id } = await params;

    const certRequest = await prisma.medicalCertificateRequest.findUnique({
      where: { id },
      include: { finalReport: true },
    });

    if (!certRequest || certRequest.organizationId !== organizationId) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }
    if (!certRequest.finalReport) {
      return NextResponse.json({ error: "Parecer final ainda não disponível." }, { status: 404 });
    }

    const report = certRequest.finalReport;
    return NextResponse.json({
      data: {
        result: report.result,
        confidenceScore: report.confidenceScore,
        riskLevel: report.riskLevel,
        executiveSummary: report.executiveSummary,
        clientVisibleNotes: report.clientVisibleNotes,
        limitations: report.limitations,
        generatedAt: report.generatedAt,
        approvedAt: report.approvedAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
