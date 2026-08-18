import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <Image src="/brand/icon-color.png" alt="" width={24} height={24} className="size-6" />
          <span className="text-lg font-semibold">MedCheck</span>
        </div>
        <h2 className="text-xl font-semibold">Recuperar acesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe seu e-mail corporativo. Se houver uma conta associada, você receberá as
          instruções para redefinir sua senha.
        </p>
        <form className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="voce@empresa.com.br" required />
          </div>
          <Button type="submit" className="w-full">
            Enviar instruções
          </Button>
        </form>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}
