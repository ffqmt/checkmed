import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { internalRequestColumns } from "@/components/requests/columns";
import { STATUS_LABELS, RISK_LABELS } from "@/lib/constants";
import type { RequestStatus, RiskLevel, Prisma } from "@prisma/client";

const OPEN_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "OCR_RUNNING",
  "OCR_COMPLETED",
  "DATA_EXTRACTED",
  "AUTO_VALIDATION_RUNNING",
  "WAITING_HUMAN_REVIEW",
  "MANUAL_REVIEW",
  "WAITING_CLINIC_CONTACT",
  "CLINIC_CONTACTED",
  "WAITING_EXTERNAL_RESPONSE",
  "SUPERVISOR_REVIEW",
] as const;

export default async function OpsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; riskLevel?: string }>;
}) {
  const params = await searchParams;

  const where: Prisma.MedicalCertificateRequestWhereInput = params.status
    ? { status: params.status as RequestStatus }
    : { status: { in: [...OPEN_STATUSES] } };

  if (params.q) where.employeeName = { contains: params.q, mode: "insensitive" };
  if (params.riskLevel) where.riskLevel = params.riskLevel as RiskLevel;

  const requests = await prisma.medicalCertificateRequest.findMany({
    where,
    include: { organization: true, assignedTo: true },
    orderBy: [{ priority: "desc" }, { slaDueAt: "asc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fila de análise</h2>
        <p className="text-sm text-muted-foreground">Casos aguardando revisão humana, contato ou aprovação.</p>
      </div>

      <FilterBar
        searchPlaceholder="Buscar por colaborador..."
        selects={[
          { paramName: "status", placeholder: "Status", options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
          { paramName: "riskLevel", placeholder: "Confiabilidade", options: Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })) },
        ]}
      />

      <DataTable
        columns={internalRequestColumns}
        data={requests.map((r) => ({
          id: r.id,
          employeeName: r.employeeName,
          employeeDocumentMasked: r.employeeDocumentMasked,
          status: r.status,
          riskLevel: r.riskLevel,
          priority: r.priority,
          createdAt: r.createdAt,
          slaDueAt: r.slaDueAt,
          organizationName: r.organization.name,
          assignedToName: r.assignedTo?.name ?? null,
        }))}
        rowHrefBase="/ops/requests"
        emptyTitle="Fila vazia"
        emptyDescription="Não há casos aguardando ação neste momento."
      />
    </div>
  );
}
