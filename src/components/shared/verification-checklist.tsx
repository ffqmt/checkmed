import { CheckCircle2, AlertTriangle, MinusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChecklistItemStatus = "ok" | "attention" | "neutral" | "pending";

export type ChecklistItem = {
  label: string;
  status: ChecklistItemStatus;
  description: string;
};

const STATUS_CONFIG: Record<ChecklistItemStatus, { icon: typeof CheckCircle2; className: string }> = {
  ok: { icon: CheckCircle2, className: "text-status-success" },
  attention: { icon: AlertTriangle, className: "text-status-warning" },
  neutral: { icon: MinusCircle, className: "text-muted-foreground" },
  pending: { icon: Loader2, className: "text-primary animate-spin" },
};

/** Per-check breakdown for the client-facing detail page — each of the automated pipeline's stages shown with its own honest status, instead of one aggregate score standing in for all of them. */
export function VerificationChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const { icon: Icon, className } = STATUS_CONFIG[item.status];
        return (
          <li key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
