"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateMyPhone } from "@/server/actions/users";

export function WhatsAppNumberForm({ defaultPhone }: { defaultPhone: string | null }) {
  const [phone, setPhone] = React.useState(defaultPhone ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    const result = await updateMyPhone({ phone });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Número salvo.");
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="whatsapp-phone">Seu número de WhatsApp</Label>
        <Input
          id="whatsapp-phone"
          placeholder="Ex: 5511987654321"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={pending || phone.trim() === (defaultPhone ?? "")}>
        Salvar
      </Button>
    </div>
  );
}
