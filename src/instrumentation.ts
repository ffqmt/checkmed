import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Safe even when SENTRY_DSN isn't set — Sentry.init() with no dsn leaves
// this as a documented no-op rather than throwing.
export const onRequestError = Sentry.captureRequestError;
