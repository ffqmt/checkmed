// Shared with both the "use server" actions module (which may only export
// async functions, so this constant can't live there) and client components
// rendering the event checklist — kept dependency-free so it's safe in both.
export const WEBHOOK_EVENTS = [
  "request.received",
  "request.processing_started",
  "request.waiting_human_review",
  "request.waiting_external_response",
  "request.completed",
  "request.inconsistent",
  "request.contested",
] as const;
