import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { findDocEntry } from "@/lib/docs-index";

export default async function DocumentacaoDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const found = findDocEntry(slug.join("/"));
  if (!found) notFound();
  const { entry, category } = found;

  // `entry.slug` comes from our own static index, never from the raw route
  // params — the lookup above is what keeps this fs read from ever touching
  // an attacker-controlled path.
  const filePath = path.join(process.cwd(), "docs", `${entry.slug}.md`);
  const raw = await fs.readFile(filePath, "utf-8");
  const content = raw.replace(/^#\s+.+\n/, "");
  const basePath = entry.slug.split("/").slice(0, -1).join("/");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/ops/documentacao">
              <ArrowLeft /> {category.label}
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{entry.title}</h2>
        </div>
      </div>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <MarkdownContent content={content} basePath={basePath} />
        </CardContent>
      </Card>
    </div>
  );
}
