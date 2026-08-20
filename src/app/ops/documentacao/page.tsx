import Link from "next/link";
import { ChevronRight, Presentation, Layers, Stethoscope, TrendingUp, Scale, LifeBuoy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOC_CATEGORIES, type DocAccent } from "@/lib/docs-index";

const ACCENT_ICON: Record<DocAccent, typeof Layers> = {
  blue: Layers,
  teal: Stethoscope,
  amber: TrendingUp,
  violet: Scale,
  rose: LifeBuoy,
};

const ACCENT_CLASSES: Record<DocAccent, { border: string; badge: string; title: string }> = {
  blue: { border: "border-l-blue-400", badge: "bg-blue-100 text-blue-600", title: "text-blue-700" },
  teal: { border: "border-l-teal-400", badge: "bg-teal-100 text-teal-600", title: "text-teal-700" },
  amber: { border: "border-l-amber-400", badge: "bg-amber-100 text-amber-600", title: "text-amber-800" },
  violet: { border: "border-l-violet-400", badge: "bg-violet-100 text-violet-600", title: "text-violet-700" },
  rose: { border: "border-l-rose-400", badge: "bg-rose-100 text-rose-600", title: "text-rose-700" },
};

export default function DocumentacaoIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Documentação</h2>
        <p className="text-sm text-muted-foreground">
          Material de estudo do produto, da análise, da venda e do suporte ao cliente — cresce junto com o produto.
        </p>
      </div>

      <Link href="/ops/documentacao/apresentacao" className="block">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary to-[#12283f] px-6 py-5 text-primary-foreground shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Presentation className="size-5" />
            </div>
            <div>
              <p className="font-semibold">Apresentação para o cliente</p>
              <p className="text-sm text-primary-foreground/80">
                Slides prontos, um clique de cada vez — abra na reunião e apresente direto da tela.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium">
            Abrir apresentação <ArrowRight className="size-4" />
          </span>
        </div>
      </Link>

      {DOC_CATEGORIES.map((category) => {
        const Icon = ACCENT_ICON[category.accent];
        const classes = ACCENT_CLASSES[category.accent];
        return (
          <section key={category.id} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${classes.badge}`}>
                <Icon className="size-4" />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${classes.title}`}>{category.label}</h3>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.entries.map((entry) => (
                <Link key={entry.slug} href={`/ops/documentacao/${entry.slug}`} className="block">
                  <Card className={`h-full border-l-4 ${classes.border} transition-shadow hover:shadow-md`}>
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
        );
      })}
    </div>
  );
}
