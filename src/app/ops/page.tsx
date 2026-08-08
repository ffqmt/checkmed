import Link from "next/link";
import { Inbox, AlertTriangle, Gauge, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDistributionChart } from "@/components/shared/status-distribution-chart";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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

export default async function OpsDashboardPage() {
  const [openCount, slaBreached, criticalRisk, statusGroups, avgScoreResult] = await Promise.all([
    prisma.medicalCertificateRequest.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
    prisma.medicalCertificateRequest.count({
      where: { status: { in: [...OPEN_STATUSES] }, slaDueAt: { lt: new Date() } },
    }),
    prisma.medicalCertificateRequest.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] }, completedAt: null } }),
    prisma.medicalCertificateRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.medicalCertificateRequest.aggregate({ _avg: { confidenceScore: true }, where: { confidenceScore: { not: null } } }),
  ]);

  const chartData = statusGroups
    .filter((g) => g._count._all > 0)
    .map((g) => ({ label: STATUS_LABELS[g.status], count: g._count._all, tone: STATUS_TONE[g.status] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Painel operacional</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as organizações.</p>
        </div>
        <Button asChild>
          <Link href="/ops/queue">
            <Inbox /> Ir para a fila de análise
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Casos em aberto" value={openCount} icon={Inbox} />
        <MetricCard label="SLA vencido" value={slaBreached} icon={AlertTriangle} tone={slaBreached > 0 ? "danger" : "default"} />
        <MetricCard label="Risco alto/crítico em aberto" value={criticalRisk} icon={ShieldAlert} tone={criticalRisk > 0 ? "warning" : "default"} />
        <MetricCard
          label="Score médio (concluídos)"
          value={avgScoreResult._avg.confidenceScore ? Math.round(avgScoreResult._avg.confidenceScore) : "—"}
          icon={Gauge}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusDistributionChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
