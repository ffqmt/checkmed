import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { DISPUTE_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export default async function ClientDisputesPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId!;

  const disputes = await prisma.dispute.findMany({
    where: { request: { organizationId } },
    include: { request: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contestações</h2>
        <p className="text-sm text-muted-foreground">Acompanhe as contestações abertas para solicitações da sua empresa.</p>
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nenhuma contestação registrada" description="Contestações abertas a partir de uma solicitação concluída aparecerão aqui." />
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Link key={d.id} href={`/app/requests/${d.requestId}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="text-sm font-medium">{d.request.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{d.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</span>
                    <Badge variant="secondary">{DISPUTE_STATUS_LABELS[d.status]}</Badge>
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
