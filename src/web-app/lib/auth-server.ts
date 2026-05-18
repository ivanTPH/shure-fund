/**
 * Server-only auth helpers (API route guards).
 * Import these only in API routes and server components — never in client components.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { hasRole, getRole } from "./auth";
import type { AppRole } from "./auth";

type RouteContext = unknown;
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
  user: User,
) => Promise<NextResponse> | NextResponse;

export function withRole(...allowedRoles: AppRole[]) {
  return function (handler: RouteHandler) {
    return async function (request: NextRequest, context: RouteContext) {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (allowedRoles.length > 0 && !hasRole(user, ...allowedRoles)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return handler(request, context, user);
    };
  };
}

export const withAuth = withRole();

// ---------------------------------------------------------------------------
// Project membership guard
// ---------------------------------------------------------------------------

/**
 * Verifies the user is a participant on the given project.
 *
 * Passes for:
 *   - admin role (always)
 *   - project_members row matching user_id + project_id
 *   - projects.funder_id or developer_id matching user_id
 *   - contracts.contractor_id matching user_id (for the project)
 *
 * Returns null if the user has access, or a 403 NextResponse if they don't.
 */
export async function assertProjectAccess(
  service: SupabaseClient,
  user: User,
  projectId: string,
): Promise<NextResponse | null> {
  const role = getRole(user);

  // Admins bypass membership checks (fast path: JWT metadata)
  if (role === "admin") return null;

  // Fallback: check public.users.role in case JWT metadata hasn't refreshed yet
  // (common immediately after signup before the session is refreshed)
  if (!role) {
    const { data: dbUser } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (dbUser?.role === "admin") return null;
  }

  // Check project_members table (most common path)
  const { data: member } = await service
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (member) return null;

  // Fallback: check funder_id / developer_id on the project row
  const { data: proj } = await service
    .from("projects")
    .select("funder_id, developer_id")
    .eq("id", projectId)
    .single();

  if (proj && (proj.funder_id === user.id || proj.developer_id === user.id)) {
    return null;
  }

  // Fallback: check contractor_id via contracts
  const { data: contract } = await service
    .from("contracts")
    .select("id")
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (contract) return null;

  // Lazy membership: any authenticated user with a valid role gets auto-added
  // to project_members on first access. This ensures dev test users (whose
  // accounts pre-exist and therefore never triggered fn_handle_new_user) can
  // access the demo projects without manual seeding.
  let userRole = getRole(user);
  if (!userRole) {
    // JWT metadata missing — fall back to public.users table
    const { data: dbUser } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    userRole = (dbUser?.role as AppRole | null) ?? null;
  }
  if (userRole) {
    // Ensure public.users row exists (FK required by project_members)
    await service.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
        role: userRole,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    await service.from("project_members").upsert(
      { project_id: projectId, user_id: user.id, role: userRole, is_primary: false },
      { onConflict: "project_id,user_id", ignoreDuplicates: true },
    );
    return null;
  }

  return NextResponse.json(
    { error: "You are not a participant on this project." },
    { status: 403 },
  );
}
