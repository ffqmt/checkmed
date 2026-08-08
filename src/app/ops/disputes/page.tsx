import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DISPUTE_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export default async function OpsDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    where: { status: { in: ["OPEN", "IN_REVIEW", "WAITING_ADDITIONAL_INFORMATION"] } },
    include: { request: { include: { organization: true } }, openedBy: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contestações</h2>
        <p className="text-sm text-muted-foreground">Casos contestados por clientes que aguardam tratamento.</p>
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nenhuma contestação em aberto" />
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => (
            <Link key={d.id} href={`/ops/requests/${d.requestId}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{d.request.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{d.request.organization.name} · {d.reason}</p>
                    <p className="text-xs text-muted-foreground">Aberta por {d.openedBy.name} em {formatDateTime(d.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {d.assignedTo ? `Responsável: ${d.assignedTo.name}` : "Não atribuída"}
                    </span>
                    <Badge variant="warning">{DISPUTE_STATUS_LABELS[d.status]}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
