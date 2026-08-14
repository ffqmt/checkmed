import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { KanbanBoard } from "@/components/shared/kanban-board";
import { REQUEST_STAGE_GROUPS, requestStageKeyForStatus } from "@/lib/request-stage-groups";
import { formatDateTime } from "@/lib/utils";
import type { RequestStatus, RiskLevel } from "@prisma/client";

export type RequestKanbanItem = {
  id: string;
  employeeName: string;
  status: RequestStatus;
  riskLevel: RiskLevel | null;
  createdAt: Date | string;
  organizationName?: string;
};

export function RequestKanbanBoard({ requests, hrefBase }: { requests: RequestKanbanItem[]; hrefBase: string }) {
  const columns = REQUEST_STAGE_GROUPS.map((stage) => ({
    key: stage.key,
    label: stage.label,
    items: requests.filter((r) => requestStageKeyForStatus(r.status) === stage.key),
  }));

  return (
    <KanbanBoard
      columns={columns}
      emptyTitle="Nenhuma solicitação encontrada"
      renderCard={(r) => (
        <Link href={`${hrefBase}/${r.id}`}>
          <Card className="transition-colors hover:bg-muted/30">
            <CardContent className="space-y-1.5 p-3">
              <p className="text-sm font-medium leading-tight">{r.employeeName}</p>
              {r.organizationName && <p className="text-xs text-muted-foreground">{r.organizationName}</p>}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                {r.riskLevel && <RiskBadge level={r.riskLevel} />}
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
