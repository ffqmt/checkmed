import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingPlanDialog } from "./billing-plan-dialog";

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

  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      subscription: true,
      invoices: { orderBy: { referenceMonth: "desc" }, take: 1 },
      _count: { select: { usageRecords: { where: { billedAt: { gte: monthStart } } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cobrança</h2>
        <p className="text-sm text-muted-foreground">
          Plano, assinatura Asaas (mensalidade-base) e faturamento de uso (variável por atestado, cobrado mensalmente) por
          organização. Sem <code className="rounded bg-muted px-1 py-0.5 text-xs">ASAAS_API_KEY</code> configurada, a
          ativação de assinatura fica desabilitada — nada é fingido como cobrado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{org.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {org.billingPlanTier && <Badge variant="outline">{org.billingPlanTier}</Badge>}
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
              <div className="mt-4">
                <BillingPlanDialog
                  organizationId={org.id}
                  organizationName={org.name}
                  currentTier={org.billingPlanTier}
                  currentBaseFeeCents={org.billingBaseFeeCents}
                  currentPerUnitCents={org.billingPerUnitCents}
                  hasSubscription={!!org.subscription}
                  subscriptionStatus={org.subscription?.status ?? null}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
