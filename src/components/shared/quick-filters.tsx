"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type QuickFilter = {
  key: string;
  label: string;
  /** URL params this chip sets when activated. Clicking an already-active chip clears them (toggle off). */
  params: Record<string, string>;
};

export function QuickFilters({ filters }: { filters: QuickFilter[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(filter: QuickFilter) {
    return Object.entries(filter.params).every(([k, v]) => (searchParams.get(k) ?? "") === v);
  }

  function hrefFor(filter: QuickFilter, active: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(filter.params)) {
      if (active || !value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => {
        const active = isActive(filter);
        return (
          <Link
            key={filter.key}
            href={hrefFor(filter, active)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
