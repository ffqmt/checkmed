import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/components/shared/kanban-board";
import { DISPUTE_STATUS_LABELS, DISPUTE_STATUS_ORDER } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { DisputeStatus } from "@prisma/client";

export type DisputeKanbanItem = {
  id: string;
  requestId: string;
  employeeName: string;
  reason: string;
  status: DisputeStatus;
  createdAt: Date | string;
  organizationName?: string;
};

export function DisputeKanbanBoard({ disputes, hrefBase }: { disputes: DisputeKanbanItem[]; hrefBase: string }) {
  const columns = DISPUTE_STATUS_ORDER.map((status) => ({
    key: status,
    label: DISPUTE_STATUS_LABELS[status],
    items: disputes.filter((d) => d.status === status),
  }));

  return (
    <KanbanBoard
      columns={columns}
      emptyTitle="Nenhuma contestação encontrada"
      renderCard={(d) => (
        <Link href={`${hrefBase}/${d.requestId}`}>
          <Card className="transition-colors hover:bg-muted/30">
            <CardContent className="space-y-1.5 p-3">
              <p className="text-sm font-medium leading-tight">{d.employeeName}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{d.reason}</p>
              {d.organizationName && <p className="text-[11px] text-muted-foreground">{d.organizationName}</p>}
              <p className="text-[11px] text-muted-foreground">{formatDateTime(d.createdAt)}</p>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
