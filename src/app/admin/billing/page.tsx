import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingPlanDialog } from "./billing-plan-dialog";
import { AnnualPackageDialog } from "./annual-package-dialog";

function centsToBRL(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SUBSCRIPTION_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "danger",
  PENDING: "neutral",
};

export default async function AdminBillingPage() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [organizations, pendingUsageByOrg] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        subscription: true,
        invoices: { orderBy: { referenceMonth: "desc" }, take: 1 },
        annualPackages: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { usageRecords: { where: { occurredAt: { gte: monthStart } } } } },
      },
    }),
    // One pass across every org for "how much unbilled usage has accumulated so far" —
    // a single groupBy instead of an N+1 query per organization card.
    prisma.usageRecord.groupBy({ by: ["organizationId"], where: { invoiceId: null }, _count: { _all: true } }),
  ]);

  const pendingByOrgId = new Map(pendingUsageByOrg.map((g) => [g.organizationId, g._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cobrança</h2>
        <p className="text-sm text-muted-foreground">
          Plano, assinatura Asaas (mensalidade-base), pacote anual fechado, e faturamento de uso (variável por atestado,
          acumulado até atingir o mínimo da Asaas e então cobrado) por organização. Sem{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">ASAAS_API_KEY</code> configurada, a ativação fica
          desabilitada — nada é fingido como cobrado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {organizations.map((org) => {
          const activePackage = org.annualPackages[0];
          const pendingUsage = pendingByOrgId.get(org.id) ?? 0;
          return (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {org.billingPlanTier && <Badge variant="outline">{org.billingPlanTier}</Badge>}
                    {activePackage && <Badge variant="success">Pacote anual ativo</Badge>}
                    <Badge variant={SUBSCRIPTION_TONE[org.subscription?.status ?? "PENDING"]}>
                      {org.subscription?.status ?? "SEM ASSINATURA"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Mensalidade-base</p>
                    <p className="font-medium">{centsToBRL(org.billingBaseFeeCents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Por atestado</p>
                    <p className="font-medium">{centsToBRL(org.billingPerUnitCents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atestados este mês</p>
                    <p className="font-medium">{org._count.usageRecords}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última fatura de uso</p>
                    <p className="font-medium">
                      {org.invoices[0] ? `${centsToBRL(org.invoices[0].totalCents)} · ${org.invoices[0].status}` : "—"}
                    </p>
                  </div>
                </div>
                {pendingUsage > 0 && !activePackage && (
                  <p className="mt-3 rounded-lg bg-status-info/10 px-3 py-2 text-xs text-status-info">
                    {pendingUsage} atestado{pendingUsage > 1 ? "s" : ""} acumulado{pendingUsage > 1 ? "s" : ""} aguardando
                    atingir o valor mínimo da Asaas para gerar a próxima cobrança de uso.
                  </p>
                )}
                {activePackage && (
                  <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Pacote anual de {centsToBRL(activePackage.totalValueCents)} em {activePackage.installmentCount}x, válido
                    até {activePackage.endDate.toLocaleDateString("pt-BR")} — uso não é medido nem cobrado à parte enquanto
                    ele estiver ativo.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <BillingPlanDialog
                    organizationId={org.id}
                    organizationName={org.name}
                    currentTier={org.billingPlanTier}
                    currentBaseFeeCents={org.billingBaseFeeCents}
                    currentPerUnitCents={org.billingPerUnitCents}
                    hasSubscription={!!org.subscription}
                    subscriptionStatus={org.subscription?.status ?? null}
                  />
                  <AnnualPackageDialog organizationId={org.id} organizationName={org.name} hasActivePackage={!!activePackage} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
