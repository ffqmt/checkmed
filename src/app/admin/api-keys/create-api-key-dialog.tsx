"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createApiKey } from "@/server/actions/api-keys";

export function CreateApiKeyDialog({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [organizationId, setOrganizationId] = React.useState(organizations[0]?.id ?? "");
  const [pending, setPending] = React.useState(false);
  const [rawKey, setRawKey] = React.useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setPending(true);
    const result = await createApiKey(organizationId, name);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setRawKey(result!.rawKey!);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setRawKey(null);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nova API key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova API key</DialogTitle>
        </DialogHeader>
        {rawKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copie esta chave agora — por segurança, ela não será exibida novamente.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm">
              <span className="flex-1 break-all">{rawKey}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(rawKey);
                  toast.success("Copiado.");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
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
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Integração RH" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={pending || !name || !organizationId}>
                Gerar chave
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
