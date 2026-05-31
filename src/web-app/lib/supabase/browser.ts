import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase client for use inside Client Components.
 * Call once per render — @supabase/ssr creates a stable singleton internally.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
