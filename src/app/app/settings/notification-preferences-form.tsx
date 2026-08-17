"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateNotificationPreference } from "@/server/actions/users";

const OPTIONS: { key: keyof Values; label: string; description: string }[] = [
  { key: "notifyOnRequestReceived", label: "Solicitação recebida", description: "Quando uma nova solicitação é registrada." },
  { key: "notifyOnProcessingStarted", label: "Análise iniciada", description: "Quando o processamento automático começa." },
  { key: "notifyOnWaitingExternalResponse", label: "Aguardando resposta externa", description: "Quando aguardamos confirmação de uma fonte externa." },
  { key: "notifyOnCompleted", label: "Análise concluída", description: "Quando o parecer final é emitido." },
  { key: "notifyOnInconsistency", label: "Revisão necessária", description: "Quando indícios exigem atenção adicional." },
];

type Values = {
  notifyOnRequestReceived: boolean;
  notifyOnProcessingStarted: boolean;
  notifyOnWaitingExternalResponse: boolean;
  notifyOnCompleted: boolean;
  notifyOnInconsistency: boolean;
  notifyViaWhatsApp: boolean;
};

export function NotificationPreferencesForm({ defaultValues, hasPhone }: { defaultValues: Values; hasPhone: boolean }) {
  const [values, setValues] = React.useState(defaultValues);
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    await updateNotificationPreference(values);
    setPending(false);
    toast.success("Preferências salvas.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-3">
        <div>
          <Label>Receber notificações por WhatsApp</Label>
          <p className="text-xs text-muted-foreground">
            {hasPhone
              ? "Além do aviso aqui no painel, os eventos marcados abaixo também chegam pelo seu WhatsApp."
              : "Cadastre seu WhatsApp acima para ativar."}
          </p>
        </div>
        <Switch
          checked={values.notifyViaWhatsApp}
          disabled={!hasPhone}
          onCheckedChange={(checked) => setValues((v) => ({ ...v, notifyViaWhatsApp: checked }))}
        />
      </div>
      {OPTIONS.map((opt) => (
        <div key={opt.key} className="flex items-center justify-between gap-4">
          <div>
            <Label>{opt.label}</Label>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
          </div>
          <Switch
            checked={values[opt.key]}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, [opt.key]: checked }))}
          />
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={pending}>
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
