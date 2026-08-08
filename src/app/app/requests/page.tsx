import Link from "next/link";
import { FileUp } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { clientRequestColumns } from "@/components/requests/columns";
import { STATUS_LABELS, RISK_LABELS } from "@/lib/constants";
import type { RequestStatus, RiskLevel, Prisma } from "@prisma/client";

export default async function ClientRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; riskLevel?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId!;
  const params = await searchParams;

  const where: Prisma.MedicalCertificateRequestWhereInput = { organizationId };
  if (params.q) where.employeeName = { contains: params.q, mode: "insensitive" };
  if (params.status) where.status = params.status as RequestStatus;
  if (params.riskLevel) where.riskLevel = params.riskLevel as RiskLevel;

  const requests = await prisma.medicalCertificateRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Solicitações</h2>
          <p className="text-sm text-muted-foreground">Todas as validações enviadas pela sua empresa.</p>
        </div>
        <Button asChild>
          <Link href="/app/requests/new">
            <FileUp /> Nova solicitação
          </Link>
        </Button>
      </div>

      <FilterBar
        searchPlaceholder="Buscar por colaborador..."
        selects={[
          { paramName: "status", placeholder: "Status", options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
          { paramName: "riskLevel", placeholder: "Confiabilidade", options: Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />

      <DataTable
        columns={clientRequestColumns}
        data={requests.map((r) => ({
          id: r.id,
          employeeName: r.employeeName,
          employeeDocumentMasked: r.employeeDocumentMasked,
          status: r.status,
          riskLevel: r.riskLevel,
          priority: r.priority,
          createdAt: r.createdAt,
          slaDueAt: r.slaDueAt,
        }))}
        rowHrefBase="/app/requests"
        emptyTitle="Nenhuma solicitação encontrada"
        emptyDescription="Ajuste os filtros ou envie uma nova solicitação de validação."
      />
    </div>
  );
}
