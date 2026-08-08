import type { AiContentDetectionResult } from "./types";
import { SightengineAiDetectionAdapter } from "./adapters/sightengine-ai-detection.adapter";

export interface AiContentDetectionService {
  detect(file: { buffer: Buffer; mimeType: string }): Promise<AiContentDetectionResult>;
}

/**
 * Provider selection mirrors whatsapp.service.ts's adapterFor pattern —
 * swap AI_DETECTION_PROVIDER to point at a different Phase 2 vendor (Hive,
 * Copyleaks, ...) by adding another adapter class here, no call-site changes.
 */
class DefaultAiContentDetectionService implements AiContentDetectionService {
  async detect(file: { buffer: Buffer; mimeType: string }): Promise<AiContentDetectionResult> {
    const provider = (process.env.AI_DETECTION_PROVIDER ?? "NONE").toUpperCase();

    if (provider === "SIGHTENGINE") {
      return new SightengineAiDetectionAdapter().detect(file);
    }

    return { provider: "NONE", aiGeneratedScore: null, deepfakeScore: null, rawResponse: null, status: "NOT_CONFIGURED" };
  }
}

export const aiDetectionService: AiContentDetectionService = new DefaultAiContentDetectionService();
