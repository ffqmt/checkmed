import { inngest } from "./client";
import { runCertificateValidationWorkflow } from "@/server/services/workflow";
import { recordTimelineEvent } from "@/server/timeline";

/**
 * Replaces the old "call runCertificateValidationWorkflow() directly inside
 * the upload request/response cycle" pattern — that meant every upload's
 * OCR→decision pipeline (which can run for a while) shared a Vercel
 * Function's execution window and competed for the same limited DB
 * connection pool as the HTTP response itself. Moving it here means the
 * upload request returns immediately once the event is queued, and the
 * actual processing runs in its own execution, retried by Inngest's
 * infrastructure rather than lost if the request's own function times out.
 *
 * retries: 0 is deliberate, not a placeholder — the workflow is NOT
 * idempotent (ExtractedData.requestId is unique; a retry after partial
 * completion would throw on that constraint, not cleanly redo the work).
 * Making it safely retryable is real work of its own, out of scope here —
 * today's behavior (a failure fails once, visibly, not silently retried
 * into a broken half-state) is preserved exactly.
 */
export const processCertificateRequest = inngest.createFunction(
  { id: "process-certificate-request", retries: 0, triggers: { event: "certificate/uploaded" } },
  async ({ event }) => {
    const { requestId } = event.data as { requestId: string };
    try {
      await runCertificateValidationWorkflow(requestId);
    } catch (error) {
      console.error("Workflow failed", requestId, error);
      await recordTimelineEvent({
        requestId,
        eventType: "STATUS_CHANGED",
        title: "Falha no processamento automático",
        description: (error as Error).message,
        isClientVisible: false,
      });
    }
  },
);
