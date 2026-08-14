import Link from "next/link";
import { FileUp } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { ViewToggle } from "@/components/shared/view-toggle";
import { QuickFilters } from "@/components/shared/quick-filters";
import { clientRequestColumns } from "@/components/requests/columns";
import { RequestKanbanBoard } from "@/components/requests/request-kanban-board";
import { STATUS_LABELS, RISK_LABELS } from "@/lib/constants";
import { DONE_REQUEST_STATUSES } from "@/lib/request-stage-groups";
import type { RequestStatus, RiskLevel, Prisma } from "@prisma/client";

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const KANBAN_LIMIT = 300;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function ClientRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; riskLevel?: string; period?: string; stage?: string; page?: string; view?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId!;
  const params = await searchParams;
  const isKanban = params.view === "kanban";

  const where: Prisma.MedicalCertificateRequestWhereInput = { organizationId };
  if (params.q) where.employeeName = { contains: params.q, mode: "insensitive" };
  if (params.status) {
    where.status = params.status as RequestStatus;
  } else if (params.stage === "active") {
    where.status = { notIn: DONE_REQUEST_STATUSES };
  } else if (params.stage === "done") {
    where.status = { in: DONE_REQUEST_STATUSES };
  }
  if (params.riskLevel) where.riskLevel = params.riskLevel as RiskLevel;
  if (params.period) {
    const days = Number(params.period);
    if (Number.isFinite(days) && days > 0) {
      where.createdAt = { gte: daysAgo(days) };
    }
  }

  const page = Math.max(1, Number(params.page) || 1);

  const paginationArgs: { skip?: number; take: number } = isKanban
    ? { take: KANBAN_LIMIT }
    : { skip: (page - 1) * DEFAULT_PAGE_SIZE, take: DEFAULT_PAGE_SIZE };

  const [totalCount, requests] = await Promise.all([
    isKanban ? Promise.resolve(0) : prisma.medicalCertificateRequest.count({ where }),
    prisma.medicalCertificateRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          searchPlaceholder="Buscar por colaborador..."
          selects={[
            { paramName: "status", placeholder: "Status", options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
            { paramName: "riskLevel", placeholder: "Confiabilidade", options: Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })) },
            { paramName: "period", placeholder: "Período", options: PERIOD_OPTIONS },
          ]}
        />
        <ViewToggle />
      </div>

      <QuickFilters
        filters={[
          { key: "active", label: "Em andamento", params: { stage: "active" } },
          { key: "done", label: "Concluídas", params: { stage: "done" } },
        ]}
      />

      {isKanban ? (
        <RequestKanbanBoard
          hrefBase="/app/requests"
          requests={requests.map((r) => ({
            id: r.id,
            employeeName: r.employeeName,
            status: r.status,
            riskLevel: r.riskLevel,
            createdAt: r.createdAt,
          }))}
        />
      ) : (
        <>
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
          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
