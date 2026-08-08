import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-status-success",
    warning: "text-status-warning",
    danger: "text-status-danger",
  }[tone];

  return (
    <Card className={cn("gap-0", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && (
            <div className="rounded-md bg-muted p-1.5">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
