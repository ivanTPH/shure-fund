import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";

/**
 * Root route — role-aware landing page.
 *
 * Middleware handles unauthenticated users (→ /auth/login).
 * Authenticated users are directed to the most relevant hub for their role:
 *  - contractor  → /contractor  (their stages and evidence queue)
 *  - commercial  → /approvals   (sign-off queue)
 *  - consultant  → /approvals   (sign-off queue)
 *  - funder      → /projects    (financial overview with attention panel)
 *  - developer   → /projects    (programme view)
 *  - admin       → /projects    (all-projects overview)
 */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = getRole(user);

  if (role === "contractor") redirect("/contractor");
  if (role === "commercial" || role === "consultant") redirect("/approvals");

  // funder, developer, admin, and unknown → projects list
  redirect("/projects");
}
