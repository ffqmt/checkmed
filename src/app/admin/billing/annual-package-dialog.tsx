"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAnnualPackage } from "@/server/actions/billing";

type BillingType = "BOLETO" | "PIX" | "CREDIT_CARD";

export function AnnualPackageDialog({
  organizationId,
  organizationName,
  hasActivePackage,
}: {
  organizationId: string;
  organizationName: string;
  hasActivePackage: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [totalValue, setTotalValue] = React.useState("");
  const [installmentCount, setInstallmentCount] = React.useState("12");
  const [billingType, setBillingType] = React.useState<BillingType>("CREDIT_CARD");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  if (hasActivePackage) {
    return (
      <Button size="sm" variant="outline" disabled>
        <CalendarRange /> Pacote anual ativo
      </Button>
    );
  }

  async function handleSubmit() {
    const valueCents = Math.round(parseFloat(totalValue.replace(",", ".")) * 100);
    const installments = parseInt(installmentCount, 10);
    if (!valueCents || !installments) return;

    setPending(true);
    const result = await createAnnualPackage(organizationId, valueCents, installments, billingType);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Pacote anual ativado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarRange /> Pacote anual
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pacote anual — {organizationName}</DialogTitle>
          <DialogDescription>
            Valor fechado, parcelado, válido por 12 meses a partir de hoje. Uso não é medido nem cobrado à parte enquanto
            esse pacote estiver ativo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="totalValue">Valor total do pacote (R$)</Label>
            <Input id="totalValue" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="ex.: 2000,00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="installmentCount">Número de parcelas</Label>
              <Input
                id="installmentCount"
                type="number"
                min={1}
                max={24}
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada parcela precisa ficar acima do mínimo que a Asaas aceita (R$ 5 no cartão, R$ 10 no boleto/PIX) — dividimos
            o valor total pelo número de parcelas antes de enviar, e avisamos aqui se ficar abaixo disso.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !totalValue || !installmentCount}>
            Ativar pacote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
