"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createContactAttempt } from "@/server/actions/contact-attempts";

const RESULTS = [
  { value: "CONFIRMED_ISSUANCE", label: "Emissão confirmada pela instituição" },
  { value: "DENIED_ISSUANCE", label: "Instituição não reconheceu a emissão" },
  { value: "NOT_FOUND", label: "Contato não localizado" },
  { value: "REQUESTED_PATIENT_AUTHORIZATION", label: "Instituição solicitou autorização do paciente" },
  { value: "NO_RESPONSE", label: "Sem resposta" },
  { value: "INVALID_CONTACT", label: "Canal de contato inválido" },
  { value: "CALL_BACK_LATER", label: "Solicitaram novo contato posterior" },
  { value: "OTHER", label: "Outro" },
];

export function ContactAttemptForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createContactAttempt({
      requestId,
      contactType: formData.get("contactType"),
      contactTarget: formData.get("contactTarget"),
      contactValue: formData.get("contactValue"),
      attemptedAt: formData.get("attemptedAt"),
      contactedPersonName: formData.get("contactedPersonName") || undefined,
      contactedPersonRole: formData.get("contactedPersonRole") || undefined,
      result: formData.get("result"),
      notes: formData.get("notes") || undefined,
      isClientVisible: formData.get("isClientVisible") === "on",
    });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Contato registrado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Phone /> Registrar contato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar contato com a instituição</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select name="contactType" defaultValue="PHONE">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONE">Telefone</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="PORTAL">Portal</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attemptedAt">Data/hora do contato</Label>
              <Input id="attemptedAt" name="attemptedAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactTarget">Instituição contatada</Label>
            <Input id="contactTarget" name="contactTarget" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactValue">Telefone / e-mail / canal utilizado</Label>
            <Input id="contactValue" name="contactValue" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactedPersonName">Pessoa contatada</Label>
              <Input id="contactedPersonName" name="contactedPersonName" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactedPersonRole">Cargo</Label>
              <Input id="contactedPersonRole" name="contactedPersonRole" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Resultado</Label>
            <Select name="result" defaultValue="NO_RESPONSE">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULTS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isClientVisible" name="isClientVisible" />
            <Label htmlFor="isClientVisible" className="text-sm font-normal">Visível para o cliente na timeline</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
