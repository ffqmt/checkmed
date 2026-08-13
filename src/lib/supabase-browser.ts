import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser-only client using the public anon key — safe to ship to the client, since direct-upload access is scoped by the short-lived signed token, not by this key's own permissions. */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error("Supabase não configurado no navegador.");
    client = createClient(url, anonKey);
  }
  return client;
}
