import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/icon-color.png" alt="" width={24} height={24} className="size-6" />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">MedCheck</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 sm:px-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium">Blog</h1>
        <p className="mt-3 text-muted-foreground">
          Conteúdo sobre validação de atestados, compliance documental e LGPD para RH e jurídico.
        </p>
        <div className="mt-12">
          <EmptyState icon={Newspaper} title="Ainda sem publicações" description="Estamos preparando os primeiros conteúdos — volte em breve." />
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground sm:px-10">
        &copy; {new Date().getFullYear()} MedCheck.{" "}
        <Link href="/" className="hover:text-foreground">Voltar ao início</Link>
      </footer>
    </div>
  );
}
