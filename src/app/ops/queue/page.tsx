import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { ViewToggle } from "@/components/shared/view-toggle";
import { QuickFilters } from "@/components/shared/quick-filters";
import { internalRequestColumns } from "@/components/requests/columns";
import { RequestKanbanBoard } from "@/components/requests/request-kanban-board";
import { STATUS_LABELS, RISK_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import type { RequestStatus, RiskLevel, RequestPriority, Prisma } from "@prisma/client";

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

const KANBAN_LIMIT = 300;

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export default async function OpsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    riskLevel?: string;
    priority?: string;
    assignedToMe?: string;
    dueSoon?: string;
    highRisk?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const isKanban = params.view === "kanban";

  // The open-only default makes sense for the list (a queue of pending work),
  // but Kanban deliberately has a "Concluída" column — defaulting it to
  // open-only would leave that column permanently empty, so Kanban shows
  // every status unless the user narrows it explicitly.
  const where: Prisma.MedicalCertificateRequestWhereInput = params.status
    ? { status: params.status as RequestStatus }
    : isKanban
      ? {}
      : { status: { in: [...OPEN_STATUSES] } };

  if (params.q) where.employeeName = { contains: params.q, mode: "insensitive" };
  if (params.riskLevel) where.riskLevel = params.riskLevel as RiskLevel;
  else if (params.highRisk === "1") where.riskLevel = { in: ["HIGH", "CRITICAL"] };
  if (params.priority) where.priority = params.priority as RequestPriority;
  if (params.assignedToMe === "1") where.assignedToUserId = session!.user.id;
  if (params.dueSoon === "1") where.slaDueAt = { lte: hoursFromNow(24) };

  const page = Math.max(1, Number(params.page) || 1);

  const paginationArgs: { skip?: number; take: number } = isKanban
    ? { take: KANBAN_LIMIT }
    : { skip: (page - 1) * DEFAULT_PAGE_SIZE, take: DEFAULT_PAGE_SIZE };

  const [totalCount, requests] = await Promise.all([
    isKanban ? Promise.resolve(0) : prisma.medicalCertificateRequest.count({ where }),
    prisma.medicalCertificateRequest.findMany({
      where,
      include: { organization: true, assignedTo: true },
      orderBy: [{ priority: "desc" }, { slaDueAt: "asc" }],
      ...paginationArgs,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fila de análise</h2>
        <p className="text-sm text-muted-foreground">Casos aguardando revisão humana, contato ou aprovação.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          searchPlaceholder="Buscar por colaborador..."
          selects={[
            { paramName: "status", placeholder: "Status", options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
            { paramName: "riskLevel", placeholder: "Confiabilidade", options: Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label })) },
            { paramName: "priority", placeholder: "Prioridade", options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
          ]}
        />
        <ViewToggle />
      </div>

      <QuickFilters
        filters={[
          { key: "mine", label: "Minhas atribuídas", params: { assignedToMe: "1" } },
          { key: "due-soon", label: "Vencendo", params: { dueSoon: "1" } },
          { key: "high-risk", label: "Alto risco", params: { highRisk: "1" } },
        ]}
      />

      {isKanban ? (
        <RequestKanbanBoard
          hrefBase="/ops/requests"
          requests={requests.map((r) => ({
            id: r.id,
            employeeName: r.employeeName,
            status: r.status,
            riskLevel: r.riskLevel,
            createdAt: r.createdAt,
            organizationName: r.organization.name,
          }))}
        />
      ) : (
        <>
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
          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
