"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertWhatsAppIntegration } from "@/server/actions/whatsapp-integration";
import type { WhatsAppProvider } from "@prisma/client";

export function WhatsAppIntegrationForm({
  organizationId,
  defaultProvider,
  defaultPhoneNumberId,
  hasAccessToken,
}: {
  organizationId: string;
  defaultProvider: WhatsAppProvider;
  defaultPhoneNumberId: string;
  hasAccessToken: boolean;
}) {
  const [provider, setProvider] = React.useState<WhatsAppProvider>(defaultProvider);
  const [phoneNumberId, setPhoneNumberId] = React.useState(defaultPhoneNumberId);
  const [accessToken, setAccessToken] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSave() {
    setPending(true);
    await upsertWhatsAppIntegration(organizationId, provider, phoneNumberId, accessToken || undefined);
    setPending(false);
    setAccessToken("");
    toast.success("Integração salva.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Provedor</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as WhatsAppProvider)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="META_CLOUD_API">Meta Cloud API</SelectItem>
            <SelectItem value="TWILIO">Twilio</SelectItem>
            <SelectItem value="ZAPI">Z-API</SelectItem>
            <SelectItem value="OTHER">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Phone Number ID</Label>
        <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Ex.: 109876543210" />
      </div>
      <div className="space-y-1.5">
        <Label>Access token</Label>
        <Input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder={hasAccessToken ? "•••••••••••• (configurado — deixe em branco pra manter)" : "Nenhum token configurado ainda"}
        />
        <p className="text-xs text-muted-foreground">
          Armazenado criptografado. Envio ainda é simulado mesmo com token — nenhum adapter real está implementado.
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={pending}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
