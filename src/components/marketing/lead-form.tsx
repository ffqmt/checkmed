"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/server/actions/leads";

export function LeadForm() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await submitLead({
      companyName: formData.get("companyName"),
      contactName: formData.get("contactName"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      message: formData.get("message") || undefined,
    });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Recebemos sua mensagem.</p>
        <p className="mt-2 text-sm text-muted-foreground">Nosso time entra em contato em breve.</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Empresa</Label>
          <Input id="companyName" name="companyName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName">Seu nome</Label>
          <Input id="contactName" name="contactName" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone (opcional)</Label>
          <Input id="phone" name="phone" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Conte um pouco sobre sua necessidade (opcional)</Label>
        <Textarea id="message" name="message" rows={3} />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        <Send /> {pending ? "Enviando..." : "Fale com a gente"}
      </Button>
    </form>
  );
}
