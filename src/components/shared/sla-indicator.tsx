import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SlaIndicator({ dueAt, completedAt }: { dueAt: Date | string | null; completedAt: Date | string | null }) {
  if (!dueAt) return <span className="text-xs text-muted-foreground">Sem SLA definido</span>;

  const due = new Date(dueAt);
  const reference = completedAt ? new Date(completedAt) : new Date();
  const diffHours = Math.round((due.getTime() - reference.getTime()) / 3600000);
  const overdue = diffHours < 0;
  const urgent = !overdue && diffHours <= 4;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        overdue ? "text-status-danger" : urgent ? "text-status-warning" : "text-muted-foreground",
      )}
    >
      {overdue ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
      {overdue
        ? `SLA vencido há ${Math.abs(diffHours)}h`
        : completedAt
        ? `Concluído dentro do SLA`
        : `${diffHours}h para o vencimento do SLA`}
    </span>
  );
}
