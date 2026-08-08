import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, FileCheck2, Building2, Workflow } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { INTERNAL_ROLES } from "@/lib/constants";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN" || session.user.role === "INTERNAL_ADMIN") redirect("/admin/organizations");
    if (INTERNAL_ROLES.includes(session.user.role)) redirect("/ops");
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <span className="text-lg font-semibold">MedCheck</span>
        </div>
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Governança documental para RH, jurídico e compliance
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Validação de atestados médicos com automação, IA e revisão humana.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          MedCheck combina OCR, verificação de médicos e clínicas, análise técnica documental e
          contato direto com instituições emissoras para gerar pareceres auditáveis e
          juridicamente seguros.
        </p>
        <div className="mt-8 flex gap-3">
          <Button size="lg" asChild>
            <Link href="/login">Acessar plataforma</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: FileCheck2, title: "Validação documental", text: "OCR, verificação de médico/clínica, QR Code e análise técnica em um único fluxo." },
            { icon: Workflow, title: "Automação com humano no loop", text: "Decisões automáticas por padrão, com revisão humana quando a confiança exige." },
            { icon: Building2, title: "Pronto para compliance", text: "Timeline auditável, mascaramento de dados sensíveis e políticas de retenção LGPD." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 text-left shadow-sm">
              <f.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} MedCheck. Plataforma de validação documental.
      </footer>
    </div>
  );
}
