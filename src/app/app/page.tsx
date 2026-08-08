import Link from "next/link";
import { FileUp, ListChecks, ShieldAlert, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { clientRequestColumns } from "@/components/requests/columns";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/constants";

export default async function ClientDashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId!;

  const [total, inProgress, validated, needsAttention, recent] = await Promise.all([
    prisma.medicalCertificateRequest.count({ where: { organizationId } }),
    prisma.medicalCertificateRequest.count({
      where: {
        organizationId,
        status: { notIn: ["VALIDATED", "VALIDATED_WITH_REMARKS", "INCONCLUSIVE", "INCONSISTENT", "NOT_CONFIRMED", "NOT_RECOGNIZED_BY_INSTITUTION", "CANCELLED", "EXPIRED"] },
      },
    }),
    prisma.medicalCertificateRequest.count({ where: { organizationId, finalResult: { in: ["VALIDATED", "VALIDATED_WITH_REMARKS"] } } }),
    prisma.medicalCertificateRequest.count({ where: { organizationId, riskLevel: { in: ["HIGH", "CRITICAL"] }, completedAt: null } }),
    prisma.medicalCertificateRequest.findMany({
      where: { organizationId, status: { in: CLIENT_VISIBLE_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Visão geral</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as validações de atestados da sua empresa.</p>
        </div>
        <Button asChild>
          <Link href="/app/requests/new">
            <FileUp /> Nova solicitação
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total de solicitações" value={total} icon={ListChecks} />
        <MetricCard label="Em andamento" value={inProgress} icon={Clock} />
        <MetricCard label="Confirmadas" value={validated} icon={ListChecks} tone="success" />
        <MetricCard label="Requerem atenção" value={needsAttention} icon={ShieldAlert} tone={needsAttention > 0 ? "warning" : "default"} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Solicitações recentes</h3>
          <Link href="/app/requests" className="text-sm font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <DataTable
          columns={clientRequestColumns}
          data={recent.map((r) => ({
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
          emptyTitle="Nenhuma solicitação ainda"
          emptyDescription="Envie o primeiro atestado para iniciar a validação automática."
        />
      </div>
    </div>
  );
}
