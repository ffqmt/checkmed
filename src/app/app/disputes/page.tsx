import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { ViewToggle } from "@/components/shared/view-toggle";
import { QuickFilters } from "@/components/shared/quick-filters";
import { clientDisputeColumns } from "@/components/requests/dispute-columns";
import { DisputeKanbanBoard } from "@/components/requests/dispute-kanban-board";
import { DISPUTE_STATUS_LABELS, OPEN_DISPUTE_STATUSES } from "@/lib/constants";
import type { DisputeStatus, Prisma } from "@prisma/client";

const KANBAN_LIMIT = 300;

export default async function ClientDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; stage?: string; page?: string; view?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId!;
  const params = await searchParams;
  const isKanban = params.view === "kanban";

  const requestWhere: Prisma.MedicalCertificateRequestWhereInput = { organizationId };
  if (params.q) requestWhere.employeeName = { contains: params.q, mode: "insensitive" };

  const where: Prisma.DisputeWhereInput = { request: requestWhere };
  if (params.status) {
    where.status = params.status as DisputeStatus;
  } else if (params.stage === "open") {
    where.status = { in: OPEN_DISPUTE_STATUSES };
  } else if (params.stage === "resolved") {
    where.status = { notIn: OPEN_DISPUTE_STATUSES };
  }

  const page = Math.max(1, Number(params.page) || 1);

  const paginationArgs: { skip?: number; take: number } = isKanban
    ? { take: KANBAN_LIMIT }
    : { skip: (page - 1) * DEFAULT_PAGE_SIZE, take: DEFAULT_PAGE_SIZE };

  const [totalCount, disputes] = await Promise.all([
    isKanban ? Promise.resolve(0) : prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      include: { request: true },
      orderBy: { createdAt: "desc" },
      ...paginationArgs,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contestações</h2>
        <p className="text-sm text-muted-foreground">Acompanhe as contestações abertas para solicitações da sua empresa.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          searchPlaceholder="Buscar por colaborador..."
          selects={[{ paramName: "status", placeholder: "Status", options: Object.entries(DISPUTE_STATUS_LABELS).map(([value, label]) => ({ value, label })) }]}
        />
        <ViewToggle />
      </div>

      <QuickFilters
        filters={[
          { key: "open", label: "Abertas", params: { stage: "open" } },
          { key: "resolved", label: "Resolvidas", params: { stage: "resolved" } },
        ]}
      />

      {isKanban ? (
        <DisputeKanbanBoard
          hrefBase="/app/requests"
          disputes={disputes.map((d) => ({
            id: d.id,
            requestId: d.requestId,
            employeeName: d.request.employeeName,
            reason: d.reason,
            status: d.status,
            createdAt: d.createdAt,
          }))}
        />
      ) : (
        <>
          <DataTable
            columns={clientDisputeColumns}
            data={disputes.map((d) => ({
              id: d.id,
              requestId: d.requestId,
              employeeName: d.request.employeeName,
              reason: d.reason,
              status: d.status,
              createdAt: d.createdAt,
            }))}
            emptyTitle="Nenhuma contestação encontrada"
            emptyDescription="Contestações abertas a partir de uma solicitação concluída aparecerão aqui."
          />
          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
