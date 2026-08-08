import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

export type TimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: Date | string;
  isClientVisible: boolean;
  userName?: string | null;
};

export function Timeline({ items, showVisibilityBadge = false }: { items: TimelineItem[]; showVisibilityBadge?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>;
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              "absolute -left-[29px] top-1 size-2.5 rounded-full border-2 border-card",
              item.isClientVisible ? "bg-status-info" : "bg-status-neutral",
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            {showVisibilityBadge && !item.isClientVisible && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="size-2.5" /> Interno
              </span>
            )}
          </div>
          {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(item.createdAt)}
            {item.userName ? ` · ${item.userName}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
