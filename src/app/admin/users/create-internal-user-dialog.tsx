"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { createAnyUser } from "@/server/actions/users";

export function CreateInternalUserDialog({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("INTERNAL_ANALYST");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const isClientRole = role === "CLIENT_ADMIN" || role === "CLIENT_USER";

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createAnyUser({
      organizationId: isClientRole ? formData.get("organizationId") : null,
      name: formData.get("name"),
      email: formData.get("email"),
      role,
      password: formData.get("password"),
    });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Usuário criado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                <SelectItem value="INTERNAL_ADMIN">Administrador Interno</SelectItem>
                <SelectItem value="INTERNAL_SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="INTERNAL_ANALYST">Analista</SelectItem>
                <SelectItem value="CLIENT_ADMIN">Administrador da Empresa</SelectItem>
                <SelectItem value="CLIENT_USER">Usuário da Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isClientRole && (
            <div className="space-y-1.5">
              <Label>Organização</Label>
              <Select name="organizationId" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a organização" />
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
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha provisória</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
