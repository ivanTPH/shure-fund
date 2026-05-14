import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

export type AppRole =
  | "admin"
  | "funder"
  | "developer"
  | "contractor"
  | "commercial"
  | "consultant";

/**
 * Human-readable labels for each role, shown in the nav and role badge.
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  funder: "Funder",
  developer: "Developer",
  contractor: "Contractor",
  commercial: "Commercial",
  consultant: "Consultant",
};

/**
 * Permissions for each role.
 * Rules from the spec:
 *   - Only Funder can trigger payment release
 *   - Only Commercial can approve certified values
 *   - Only assigned Contractor can upload evidence for their stage
 *   - Admin can manage users and permissions
 */
export const ROLE_PERMISSIONS = {
  triggerRelease: ["funder", "admin"] as AppRole[],
  approveCertifiedValues: ["commercial", "admin"] as AppRole[],
  uploadEvidence: ["contractor", "admin"] as AppRole[],
  manageUsers: ["admin"] as AppRole[],
} as const;

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export function getRole(user: User): AppRole | null {
  const role = user.user_metadata?.role as string | undefined;
  if (!role) return null;
  return role as AppRole;
}

export function hasRole(user: User, ...roles: AppRole[]): boolean {
  const userRole = getRole(user);
  if (!userRole) return false;
  return roles.includes(userRole);
}

export function hasPermission(
  user: User,
  permission: keyof typeof ROLE_PERMISSIONS,
): boolean {
  return hasRole(user, ...(ROLE_PERMISSIONS[permission] as AppRole[]));
}

// ---------------------------------------------------------------------------
// API route guard
// ---------------------------------------------------------------------------

// Next.js route handler context — params is always a Promise in App Router.
// Using `unknown` keeps the wrapper compatible with both parameterised and
// non-parameterised routes without conflicting with Next.js generated types.
type RouteContext = unknown;
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
  user: User,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js route handler with Supabase auth and optional role enforcement.
 *
 * Usage:
 *   export const GET = withRole("funder", "admin")(async (req, ctx, user) => {
 *     return NextResponse.json({ ... })
 *   })
 *
 * Pass no roles to require only authentication (any role is accepted).
 */
export function withRole(...allowedRoles: AppRole[]) {
  return function (handler: RouteHandler) {
    return async function (request: NextRequest, context: RouteContext) {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

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

/**
 * Require any authenticated user (no specific role).
 * Alias for withRole() with no arguments.
 */
export const withAuth = withRole();
