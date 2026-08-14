import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { ViewToggle } from "@/components/shared/view-toggle";
import { QuickFilters } from "@/components/shared/quick-filters";
import { internalDisputeColumns } from "@/components/requests/dispute-columns";
import { DisputeKanbanBoard } from "@/components/requests/dispute-kanban-board";
import { DISPUTE_STATUS_LABELS, OPEN_DISPUTE_STATUSES } from "@/lib/constants";
import type { DisputeStatus, Prisma } from "@prisma/client";

const KANBAN_LIMIT = 300;

export default async function OpsDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; assignedToMe?: string; unassigned?: string; all?: string; page?: string; view?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const isKanban = params.view === "kanban";

  // Same reasoning as ops/queue: the open-only default fits the list (a
  // queue of pending disputes), but Kanban has Resolvida/Indeferida/Cancelada
  // columns that would stay empty forever under that default.
  const where: Prisma.DisputeWhereInput = params.status
    ? { status: params.status as DisputeStatus }
    : params.all === "1" || isKanban
      ? {}
      : { status: { in: OPEN_DISPUTE_STATUSES } };

  if (params.q) where.request = { employeeName: { contains: params.q, mode: "insensitive" } };
  if (params.assignedToMe === "1") where.assignedToUserId = session!.user.id;
  else if (params.unassigned === "1") where.assignedToUserId = null;

  const page = Math.max(1, Number(params.page) || 1);

  const paginationArgs: { skip?: number; take: number } = isKanban
    ? { take: KANBAN_LIMIT }
    : { skip: (page - 1) * DEFAULT_PAGE_SIZE, take: DEFAULT_PAGE_SIZE };

  const [totalCount, disputes] = await Promise.all([
    isKanban ? Promise.resolve(0) : prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      include: { request: { include: { organization: true } }, openedBy: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      ...paginationArgs,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contestações</h2>
        <p className="text-sm text-muted-foreground">Casos contestados por clientes.</p>
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
          { key: "mine", label: "Minhas atribuídas", params: { assignedToMe: "1" } },
          { key: "unassigned", label: "Não atribuídas", params: { unassigned: "1" } },
          { key: "open", label: "Abertas", params: { all: "", status: "" } },
          { key: "all", label: "Todas", params: { all: "1" } },
        ]}
      />

      {isKanban ? (
        <DisputeKanbanBoard
          hrefBase="/ops/requests"
          disputes={disputes.map((d) => ({
            id: d.id,
            requestId: d.requestId,
            employeeName: d.request.employeeName,
            reason: d.reason,
            status: d.status,
            createdAt: d.createdAt,
            organizationName: d.request.organization.name,
          }))}
        />
      ) : (
        <>
          <DataTable
            columns={internalDisputeColumns}
            data={disputes.map((d) => ({
              id: d.id,
              requestId: d.requestId,
              employeeName: d.request.employeeName,
              reason: d.reason,
              status: d.status,
              createdAt: d.createdAt,
              organizationName: d.request.organization.name,
              assignedToName: d.assignedTo?.name ?? null,
            }))}
            emptyTitle="Nenhuma contestação em aberto"
          />
          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
