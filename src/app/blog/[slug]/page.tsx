import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { posts, getPostBySlug } from "../posts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

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

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:px-10">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Blog
        </Link>

        <p className="mt-6 text-xs text-muted-foreground">
          {formatDate(post.publishedAt)} · {post.readingMinutes} min de leitura
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-balance">{post.title}</h1>

        <div className="prose-medcheck mt-8 space-y-4 text-[15px] leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-lg [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_ul]:space-y-1.5">
          {post.body}
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground sm:px-10">
        &copy; {new Date().getFullYear()} MedCheck.{" "}
        <Link href="/" className="hover:text-foreground">Voltar ao início</Link>
      </footer>
    </div>
  );
}
