"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "kanban" ? "kanban" : "list";

  function hrefForView(next: "list" | "kanban") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (next === "list") params.delete("view");
    else params.set("view", "kanban");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
      <Link
        href={hrefForView("list")}
        aria-current={view === "list"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="size-3.5" /> Lista
      </Link>
      <Link
        href={hrefForView("kanban")}
        aria-current={view === "kanban"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          view === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-3.5" /> Kanban
      </Link>
    </div>
  );
}
