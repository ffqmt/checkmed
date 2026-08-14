import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

export type KanbanColumn<T> = { key: string; label: string; items: T[] };

/** Generic, domain-agnostic board — visual grouping only, no drag-and-drop. Callers group their own rows into columns and provide the card renderer. */
export function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  emptyTitle = "Nada por aqui",
}: {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  emptyTitle?: string;
}) {
  const total = columns.reduce((sum, col) => sum + col.items.length, 0);
  if (total === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.key} className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</h3>
            <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {col.items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {col.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Vazio</p>
            ) : (
              col.items.map((item) => <div key={item.id}>{renderCard(item)}</div>)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
