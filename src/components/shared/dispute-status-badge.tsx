import { Badge } from "@/components/ui/badge";
import { DISPUTE_STATUS_LABELS, DISPUTE_STATUS_TONE } from "@/lib/constants";
import type { DisputeStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const DOT_TONE: Record<string, string> = {
  neutral: "bg-status-neutral",
  info: "bg-status-info",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

export function DisputeStatusBadge({ status, className }: { status: DisputeStatus; className?: string }) {
  const tone = DISPUTE_STATUS_TONE[status];
  return (
    <Badge variant={tone} className={cn("gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", DOT_TONE[tone])} />
      {DISPUTE_STATUS_LABELS[status]}
    </Badge>
  );
}
