"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestWebhook, deleteWebhookEndpoint } from "@/server/actions/webhooks";

export function WebhookActions({ endpointId }: { endpointId: string }) {
  const router = useRouter();

  async function handleTest() {
    await sendTestWebhook(endpointId);
    toast.success("Evento de teste enviado.");
    router.refresh();
  }

  async function handleDeactivate() {
    await deleteWebhookEndpoint(endpointId);
    toast.success("Webhook desativado.");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleTest}>
        Testar
      </Button>
      <Button variant="outline" size="sm" onClick={handleDeactivate}>
        Desativar
      </Button>
    </div>
  );
}
