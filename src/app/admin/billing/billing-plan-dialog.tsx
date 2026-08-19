"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignBillingPlan, activateOrganizationSubscription } from "@/server/actions/billing";

const PLAN_DEFAULTS: Record<string, { base: number; perUnit: number }> = {
  STARTER: { base: 97, perUnit: 1.9 },
  GROWTH: { base: 197, perUnit: 1.5 },
  BUSINESS: { base: 397, perUnit: 1.2 },
};

export function BillingPlanDialog({
  organizationId,
  organizationName,
  currentTier,
  currentBaseFeeCents,
  currentPerUnitCents,
  hasSubscription,
  subscriptionStatus,
}: {
  organizationId: string;
  organizationName: string;
  currentTier: string | null;
  currentBaseFeeCents: number | null;
  currentPerUnitCents: number | null;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [tier, setTier] = React.useState(currentTier ?? "STARTER");
  const [baseFee, setBaseFee] = React.useState(currentBaseFeeCents != null ? (currentBaseFeeCents / 100).toFixed(2) : String(PLAN_DEFAULTS.STARTER.base));
  const [perUnit, setPerUnit] = React.useState(currentPerUnitCents != null ? (currentPerUnitCents / 100).toFixed(2) : String(PLAN_DEFAULTS.STARTER.perUnit));
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  function handleTierChange(next: string) {
    setTier(next);
    const defaults = PLAN_DEFAULTS[next];
    if (defaults) {
      setBaseFee(defaults.base.toFixed(2));
      setPerUnit(defaults.perUnit.toFixed(2));
    }
  }

  async function handleSavePlan() {
    setPending(true);
    const result = await assignBillingPlan(
      organizationId,
      tier as "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE",
      Math.round(parseFloat(baseFee.replace(",", ".")) * 100),
      Math.round(parseFloat(perUnit.replace(",", ".")) * 100),
    );
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Plano atribuído.");
    router.refresh();
  }

  async function handleActivate(billingType: "BOLETO" | "PIX" | "CREDIT_CARD") {
    setPending(true);
    const result = await activateOrganizationSubscription(organizationId, billingType);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Assinatura ativada no Asaas.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 /> Gerenciar cobrança
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrança — {organizationName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plano</Label>
            <Select value={tier} onValueChange={handleTierChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="GROWTH">Growth</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise (negociado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="baseFee">Mensalidade-base (R$)</Label>
              <Input id="baseFee" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perUnit">Por atestado (R$)</Label>
              <Input id="perUnit" value={perUnit} onChange={(e) => setPerUnit(e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSavePlan} disabled={pending}>
            Salvar plano
          </Button>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">Assinatura (mensalidade-base recorrente via Asaas)</p>
            {hasSubscription ? (
              <p className="text-sm text-muted-foreground">Status atual: {subscriptionStatus}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => handleActivate("BOLETO")} disabled={pending}>
                  Ativar via Boleto
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleActivate("PIX")} disabled={pending}>
                  Ativar via PIX
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleActivate("CREDIT_CARD")} disabled={pending}>
                  Ativar via cartão
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
