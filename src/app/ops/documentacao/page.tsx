import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOC_CATEGORIES } from "@/lib/docs-index";

export default function DocumentacaoIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Documentação</h2>
        <p className="text-sm text-muted-foreground">
          Material de estudo do produto, do processo de análise e da abordagem comercial — cresce junto com o produto.
        </p>
      </div>

      {DOC_CATEGORIES.map((category) => (
        <section key={category.id} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category.label}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.entries.map((entry) => (
              <Link key={entry.slug} href={`/ops/documentacao/${entry.slug}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm font-medium">{entry.title}</CardTitle>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>{entry.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
