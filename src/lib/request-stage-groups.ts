import type { RequestStatus } from "@prisma/client";

/**
 * Single source for grouping the 19 raw RequestStatus values into the 6
 * macro-stages used both by StepperWorkflow and the Requests Kanban board —
 * extracted so the two views can't silently drift apart.
 */
export const REQUEST_STAGE_GROUPS: { key: string; label: string; statuses: RequestStatus[] }[] = [
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
      // A dispute sent the request back into review — mid-flow, not a fresh case.
      "REOPENED",
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
      // Terminal states outside the normal pipeline outcome — still "no longer active".
      "CANCELLED",
      "EXPIRED",
      "CONTESTED",
    ],
  },
];

export function requestStageIndexForStatus(status: RequestStatus): number {
  const idx = REQUEST_STAGE_GROUPS.findIndex((s) => s.statuses.includes(status));
  return idx === -1 ? 0 : idx;
}

export function requestStageKeyForStatus(status: RequestStatus): string {
  return REQUEST_STAGE_GROUPS[requestStageIndexForStatus(status)].key;
}

/** Statuses considered "concluded" — used by the "Concluídas" / "Em andamento" quick filters. */
export const DONE_REQUEST_STATUSES: RequestStatus[] = REQUEST_STAGE_GROUPS[REQUEST_STAGE_GROUPS.length - 1].statuses;
