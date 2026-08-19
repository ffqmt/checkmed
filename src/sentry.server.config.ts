import * as Sentry from "@sentry/nextjs";

// Sentry.init with an empty/undefined dsn is a documented safe no-op — this
// stays inert until SENTRY_DSN is set, same "real code, gated behind
// config" pattern as every other optional integration in this codebase
// (Sightengine, WhatsApp, Asaas).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
