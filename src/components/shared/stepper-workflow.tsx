import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { REQUEST_STAGE_GROUPS, requestStageIndexForStatus } from "@/lib/request-stage-groups";
import type { RequestStatus } from "@prisma/client";

export function StepperWorkflow({ status }: { status: RequestStatus }) {
  const currentIndex = requestStageIndexForStatus(status);
  const isTerminal = ["CANCELLED", "EXPIRED", "CONTESTED", "REOPENED"].includes(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {REQUEST_STAGE_GROUPS.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && index === REQUEST_STAGE_GROUPS.length - 1 && !isTerminal);
        const active = index === currentIndex && !done;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                  done && "border-status-success bg-status-success/10 text-status-success",
                  active && "border-primary bg-primary/10 text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : index + 1}
              </span>
              <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {index < REQUEST_STAGE_GROUPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
