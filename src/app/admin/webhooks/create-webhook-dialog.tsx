"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createWebhookEndpoint } from "@/server/actions/webhooks";
import { WEBHOOK_EVENTS } from "@/lib/webhook-events";

export function CreateWebhookDialog({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [organizationId, setOrganizationId] = React.useState(organizations[0]?.id ?? "");
  const [url, setUrl] = React.useState("");
  const [events, setEvents] = React.useState<string[]>([...WEBHOOK_EVENTS]);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setPending(true);
    const result = await createWebhookEndpoint(organizationId, url, events);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Webhook criado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Novo webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo webhook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organização</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">URL do endpoint</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-empresa.com/webhooks/medcheck" />
          </div>
          <div className="space-y-1.5">
            <Label>Eventos</Label>
            <div className="grid grid-cols-1 gap-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={events.includes(ev)}
                    onCheckedChange={(checked) =>
                      setEvents((prev) => (checked ? [...prev, ev] : prev.filter((e) => e !== ev)))
                    }
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !url || events.length === 0}>
            Criar webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
