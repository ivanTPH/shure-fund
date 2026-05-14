/**
 * Legacy singleton export — used by supabaseQueries.ts for data fetching.
 * For auth-aware code, prefer lib/supabase/browser.ts (client components)
 * or lib/supabase/server.ts (server components / route handlers).
 */
import { createClient as createBrowserClient } from "./supabase/browser";

export const supabase = createBrowserClient();
