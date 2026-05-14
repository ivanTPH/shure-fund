import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Supabase client using the service role key.
 * Bypasses all RLS policies — use only inside trusted server-side code
 * that has already validated the actor's identity and permissions.
 *
 * Never send this client's results directly to a browser without
 * re-applying your own access checks.
 */
export function createServiceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
