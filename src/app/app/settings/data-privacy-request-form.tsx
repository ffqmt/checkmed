"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createDataPrivacyRequest } from "@/server/actions/data-privacy";
import { DATA_PRIVACY_REQUEST_TYPE_LABELS } from "@/lib/constants";

export function DataPrivacyRequestForm() {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createDataPrivacyRequest({
        requestType: formData.get("requestType"),
        subjectName: formData.get("subjectName"),
        subjectDocumentMasked: formData.get("subjectDocumentMasked"),
        notes: formData.get("notes") || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Solicitação registrada. Nossa equipe vai processar e te avisamos quando concluir.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a solicitação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldQuestion /> Nova solicitação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitação de privacidade (LGPD)</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo de solicitação</Label>
            <Select name="requestType" defaultValue="ACCESS">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_PRIVACY_REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subjectName">Nome do titular dos dados</Label>
            <Input id="subjectName" name="subjectName" placeholder="Nome completo do funcionário/paciente" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subjectDocumentMasked">Documento (como aparece nas solicitações, ex.: ***.879.***-94)</Label>
            <Input id="subjectDocumentMasked" name="subjectDocumentMasked" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Contexto adicional para nossa equipe, se necessário." />
          </div>
          <p className="text-xs text-muted-foreground">
            Solicitações de exclusão e anonimização são localizadas por nome e documento entre as solicitações desta
            organização e processadas por nossa equipe. Pedidos de acesso, correção e portabilidade são conduzidos
            manualmente conforme a natureza de cada caso.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Registrar solicitação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
