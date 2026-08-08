"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateRetentionPolicy } from "@/server/actions/retention";

export function RetentionForm({
  organizationId,
  defaultRetentionDays,
  defaultAutoAnonymize,
  defaultAutoDeleteFiles,
}: {
  organizationId: string;
  defaultRetentionDays: number;
  defaultAutoAnonymize: boolean;
  defaultAutoDeleteFiles: boolean;
}) {
  const [retentionDays, setRetentionDays] = React.useState(defaultRetentionDays);
  const [autoAnonymize, setAutoAnonymize] = React.useState(defaultAutoAnonymize);
  const [autoDeleteFiles, setAutoDeleteFiles] = React.useState(defaultAutoDeleteFiles);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSave() {
    setPending(true);
    await updateRetentionPolicy(organizationId, retentionDays, autoAnonymize, autoDeleteFiles);
    setPending(false);
    toast.success("Política de retenção atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Retenção (dias)</Label>
        <Input type="number" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="font-normal">Anonimizar automaticamente após expiração</Label>
        <Switch checked={autoAnonymize} onCheckedChange={setAutoAnonymize} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="font-normal">Excluir arquivos automaticamente após expiração</Label>
        <Switch checked={autoDeleteFiles} onCheckedChange={setAutoDeleteFiles} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={pending}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
