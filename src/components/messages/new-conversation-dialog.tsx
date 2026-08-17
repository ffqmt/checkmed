"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canonicalPhoneKey } from "@/lib/phone";
import { sendMessageToContact } from "@/server/actions/messages-inbox";

export function NewConversationDialog({ organizations }: { organizations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [organizationId, setOrganizationId] = React.useState("");
  const [toNumber, setToNumber] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);

  function reset() {
    setOrganizationId("");
    setToNumber("");
    setMessage("");
  }

  async function handleSend() {
    if (!organizationId || !toNumber || !message.trim()) return;
    setPending(true);
    const result = await sendMessageToContact(organizationId, toNumber, message);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Mensagem enviada.");
    const key = canonicalPhoneKey(toNumber);
    setOpen(false);
    reset();
    router.push(`/ops/messages?contact=${encodeURIComponent(key)}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nova mensagem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Envie a primeira mensagem para um número que ainda não tem histórico.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Organização</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Enviar como..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Número de destino (com DDI/DDD)</Label>
            <Input placeholder="Ex: 5566996409434" value={toNumber} onChange={(e) => setToNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={pending || !organizationId || !toNumber || !message.trim()}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
