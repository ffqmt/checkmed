import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiting for the public API (/api/v1/*) — a plain
 * in-memory counter would reset per Vercel Function instance and give no
 * real protection at all in a serverless deployment, so this needs a
 * shared store. Upstash Redis is the standard fit for Vercel: REST-based
 * (no persistent connection/pool to manage, unlike Postgres — relevant
 * given this project's pooled DB connection has already shown contention
 * under concurrent load), and has a real free tier.
 *
 * Without UPSTASH_REDIS_REST_URL/TOKEN configured, this degrades to no
 * limiting at all (logged once, not silently) rather than a fake in-memory
 * limiter that would just be lying about protecting anything in production.
 */
let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    ratelimit = null;
    return null;
  }
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    // 60/min per API key — generous for a legitimate integration polling or
    // batch-submitting, tight enough to blunt a leaked-key abuse burst
    // (each call triggers a real Claude Vision cost downstream).
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "medcheck:ratelimit",
  });
  return ratelimit;
}

let warnedNotConfigured = false;

export async function checkApiRateLimit(identifier: string): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const rl = getRatelimit();
  if (!rl) {
    if (!warnedNotConfigured) {
      console.warn("[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN não configurados — API pública está rodando SEM rate limiting.");
      warnedNotConfigured = true;
    }
    return { allowed: true, limit: Infinity, remaining: Infinity };
  }
  const result = await rl.limit(identifier);
  return { allowed: result.success, limit: result.limit, remaining: result.remaining };
}
