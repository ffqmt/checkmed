import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// .env.example ships descriptive placeholders (e.g. "https://[YOUR-PROJECT-REF].supabase.co")
// that are non-empty but not a real URL — treat those as "not configured" too,
// so an unedited .env still falls back to local storage instead of crashing.
export const isSupabaseConfigured = isValidHttpUrl(url) && Boolean(serviceRoleKey) && !url.includes("[YOUR-PROJECT-REF]");

/**
 * Server-only Supabase client using the service-role key — bypasses RLS,
 * so every call site must already enforce organization scoping in
 * application code. Never import this from client components.
 */
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(url as string, serviceRoleKey as string, {
      auth: { persistSession: false },
    })
  : null;

export const STORAGE_BUCKETS = {
  certificates: process.env.SUPABASE_STORAGE_BUCKET ?? "medical-certificates",
  evidence: process.env.SUPABASE_STORAGE_BUCKET_EVIDENCE ?? "evidence-files",
  reports: process.env.SUPABASE_STORAGE_BUCKET_REPORTS ?? "reports",
} as const;
