import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // The docs viewer (`/ops/documentacao`) reads Markdown files from `docs/`
  // at runtime via `fs`, with a dynamically built path — Next's build-time
  // file tracer can't follow that statically, so without this the route
  // 404s in production (Vercel) despite working in local dev.
  outputFileTracingIncludes: {
    "/ops/documentacao": ["./docs/**/*"],
    "/ops/documentacao/**": ["./docs/**/*"],
  },
  experimental: {
    // Server Actions default to a 1MB request body cap — well under the
    // 15MB upload limit the app itself validates (see MAX_FILE_SIZE_BYTES),
    // so real-world photos of atestados were hitting a platform-level 413
    // before reaching our own validation.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

// withSentryConfig is safe to apply even without SENTRY_ORG/SENTRY_PROJECT
// configured — it just skips the source-map-upload build step (which needs
// a SENTRY_AUTH_TOKEN) and leaves the app itself unaffected.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
