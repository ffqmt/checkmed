import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  FileCheck2,
  Building2,
  Workflow,
  MessageCircle,
  ScanSearch,
  Fingerprint,
  Lock,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/marketing/lead-form";
import { INTERNAL_ROLES } from "@/lib/constants";

const STEPS = [
  { n: "01", title: "Colaborador envia o atestado", text: "Upload direto pelo RH, ou já integrado ao seu fluxo de recebimento." },
  { n: "02", title: "Leitura real do documento", text: "IA extrai CID, datas, médico e instituição direto do arquivo — nunca um resultado aleatório." },
  { n: "03", title: "Verificação cruzada", text: "CRM do médico contra o CFM, CNPJ da clínica contra a Receita Federal, QR Code, similaridade e sinais de adulteração." },
  { n: "04", title: "Decisão automática ou revisão humana", text: "Casos claros seguem sozinhos; indícios de risco vão para um analista antes de qualquer parecer." },
  { n: "05", title: "Parecer auditável", text: "Você recebe um resultado com timeline completa, rastreável do início ao fim." },
];

const FEATURES = [
  { icon: ScanSearch, title: "Leitura real por IA", text: "Extração de dados direto do documento enviado — CID, datas, médico, instituição — não um resultado simulado." },
  { icon: Fingerprint, title: "Verificação de médico e clínica", text: "CRM confirmado contra o CFM; CNPJ da instituição consultado em tempo real na Receita Federal." },
  { icon: ShieldCheck, title: "Detecção de adulteração", text: "Análise de similaridade entre documentos e sinais de conteúdo gerado por IA ou manipulado." },
  { icon: Workflow, title: "Automação com humano no loop", text: "Decisão automática por padrão; revisão de analista/supervisor sempre que a confiança exige." },
  { icon: MessageCircle, title: "Contato direto com a instituição", text: "WhatsApp integrado — notificações automáticas ao cliente e central de mensagens com quem emitiu o atestado." },
  { icon: Lock, title: "Pronto para compliance e LGPD", text: "Retenção de dados aplicada de verdade, mascaramento de CID/documentos e solicitações do titular sob demanda." },
];

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN" || session.user.role === "INTERNAL_ADMIN") redirect("/admin/organizations");
    if (INTERNAL_ROLES.includes(session.user.role)) redirect("/ops");
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2">
            <Image src="/brand/icon-color.png" alt="" width={24} height={24} className="size-6" priority />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">MedCheck</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <a href="#contato" className="hover:text-foreground">Fale conosco</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <span className="mb-5 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Governança documental para RH, jurídico e compliance
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium leading-tight tracking-tight text-balance sm:text-5xl">
            Cada atestado médico, verificado de verdade — não só arquivado.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            MedCheck combina leitura por IA, verificação real de médico e clínica, análise técnica documental e
            contato direto com instituições emissoras para gerar pareceres auditáveis e juridicamente seguros —
            com revisão humana sempre que o caso exige.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#contato">
                Fale com a gente <ArrowRight />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Já sou cliente</Link>
            </Button>
          </div>
        </section>

        <section id="como-funciona" className="border-t border-border/60 bg-card/50 py-20">
          <div className="mx-auto max-w-5xl px-6 sm:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">Do envio ao parecer, um fluxo rastreável do início ao fim.</p>
            </div>
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <span className="font-[family-name:var(--font-display)] text-3xl text-primary/40">{s.n}</span>
                  <p className="mt-2 text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">O que é real, não simulado</h2>
              <p className="mt-3 text-muted-foreground">Cada verificação abaixo consulta uma fonte de verdade de verdade — nunca um resultado sorteado.</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <f.icon className="size-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contato" className="border-t border-border/60 bg-card/50 py-20">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:px-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Vamos conversar</h2>
              <p className="mt-4 text-muted-foreground">
                Conta um pouco sobre o volume de atestados que sua empresa recebe e como funciona seu processo hoje —
                a gente retorna com uma proposta sob medida.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="size-4" />
                57.360.731 FERNANDA FRANCO DE QUEIROZ — CNPJ 57.360.731/0001-65
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileCheck2 className="size-4" />
                medcheck@francotech.com.br
              </div>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} MedCheck — Plataforma de validação documental.</span>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <Link href="/privacidade" className="hover:text-foreground">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
