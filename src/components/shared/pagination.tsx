"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function buildPageNumbers(page: number, totalPages: number): (number | "...")[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefForPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-between gap-3 pt-1" aria-label="Paginação">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={hrefForPage(page - 1)} aria-label="Página anterior">
              <ChevronLeft className="size-3.5" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="size-8" disabled>
            <ChevronLeft className="size-3.5" />
          </Button>
        )}
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              asChild={p !== page}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className={cn("size-8 text-xs", p === page && "pointer-events-none")}
            >
              {p === page ? <span>{p}</span> : <Link href={hrefForPage(p)}>{p}</Link>}
            </Button>
          ),
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={hrefForPage(page + 1)} aria-label="Próxima página">
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="size-8" disabled>
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>
    </nav>
  );
}
