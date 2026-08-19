import Link from "next/link";
import Image from "next/image";
import { posts } from "./posts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

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

        <div className="mt-12 space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-border/60 pb-10 last:border-0">
              <p className="text-xs text-muted-foreground">
                {formatDate(post.publishedAt)} · {post.readingMinutes} min de leitura
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-medium">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Ler mais →
              </Link>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground sm:px-10">
        &copy; {new Date().getFullYear()} MedCheck.{" "}
        <Link href="/" className="hover:text-foreground">Voltar ao início</Link>
      </footer>
    </div>
  );
}
