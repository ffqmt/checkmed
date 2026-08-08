import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@prisma/client";

const STEPS: { key: string; label: string; statuses: RequestStatus[] }[] = [
  { key: "received", label: "Recebida", statuses: ["RECEIVED"] },
  { key: "ocr", label: "Leitura do documento", statuses: ["PROCESSING", "OCR_RUNNING", "OCR_COMPLETED"] },
  { key: "extraction", label: "Extração de dados", statuses: ["DATA_EXTRACTED"] },
  { key: "validation", label: "Validação automática", statuses: ["AUTO_VALIDATION_RUNNING"] },
  {
    key: "review",
    label: "Revisão / contato",
    statuses: [
      "WAITING_HUMAN_REVIEW",
      "MANUAL_REVIEW",
      "WAITING_CLINIC_CONTACT",
      "CLINIC_CONTACTED",
      "WAITING_EXTERNAL_RESPONSE",
      "SUPERVISOR_REVIEW",
    ],
  },
  {
    key: "done",
    label: "Concluída",
    statuses: [
      "FINAL_REPORT_READY",
      "VALIDATED",
      "VALIDATED_WITH_REMARKS",
      "INCONCLUSIVE",
      "INCONSISTENT",
      "NOT_CONFIRMED",
      "NOT_RECOGNIZED_BY_INSTITUTION",
    ],
  },
];

function stepIndexForStatus(status: RequestStatus) {
  const idx = STEPS.findIndex((s) => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export function StepperWorkflow({ status }: { status: RequestStatus }) {
  const currentIndex = stepIndexForStatus(status);
  const isTerminal = ["CANCELLED", "EXPIRED", "CONTESTED", "REOPENED"].includes(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && index === STEPS.length - 1 && !isTerminal);
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
            {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
