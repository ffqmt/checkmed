import type { AiContentDetectionResult } from "../types";

const SIGHTENGINE_ENDPOINT = "https://api.sightengine.com/1.0/check.json";

/**
 * Real Phase 2 provider for statistical AI-generated-image / deepfake
 * detection — https://sightengine.com/docs/ai-generated-image-detection.
 * Self-serve: create an account, grab the API user/secret from the
 * dashboard, set SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET. Falls back
 * to NOT_CONFIGURED (caller keeps using the free metadata-only heuristic)
 * when those aren't set, and to ERROR (same fallback) on any request
 * failure — a flaky third-party API must never take down the workflow.
 *
 * Only handles raster images (JPEG/PNG) — PDFs must have their embedded
 * photo extracted first (see extractLargestEmbeddedJpeg in
 * forensics-analyzers.ts) before being passed in here.
 */
export class SightengineAiDetectionAdapter {
  isConfigured(): boolean {
    return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
  }

  async detect(file: { buffer: Buffer; mimeType: string }): Promise<AiContentDetectionResult> {
    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiUser || !apiSecret) {
      return { provider: "NONE", aiGeneratedScore: null, deepfakeScore: null, rawResponse: null, status: "NOT_CONFIGURED" };
    }

    if (!file.mimeType.startsWith("image/")) {
      return { provider: "SIGHTENGINE", aiGeneratedScore: null, deepfakeScore: null, rawResponse: null, status: "UNSUPPORTED_FILE" };
    }

    try {
      const form = new FormData();
      form.append("media", new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), "document");
      form.append("models", "genai,deepfake");
      form.append("api_user", apiUser);
      form.append("api_secret", apiSecret);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try {
        response = await fetch(SIGHTENGINE_ENDPOINT, { method: "POST", body: form, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        return {
          provider: "SIGHTENGINE",
          aiGeneratedScore: null,
          deepfakeScore: null,
          rawResponse: data,
          status: "ERROR",
          error: data?.error?.message ?? `HTTP ${response.status}`,
        };
      }

      const aiGeneratedRaw = data.type?.ai_generated;
      const deepfakeRaw = data.type?.deepfake;

      return {
        provider: "SIGHTENGINE",
        aiGeneratedScore: typeof aiGeneratedRaw === "number" ? Math.round(aiGeneratedRaw * 100) : null,
        deepfakeScore: typeof deepfakeRaw === "number" ? Math.round(deepfakeRaw * 100) : null,
        rawResponse: data,
        status: "OK",
      };
    } catch (error) {
      return {
        provider: "SIGHTENGINE",
        aiGeneratedScore: null,
        deepfakeScore: null,
        rawResponse: null,
        status: "ERROR",
        error: (error as Error).message,
      };
    }
  }
}
