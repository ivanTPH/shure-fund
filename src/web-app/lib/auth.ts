import type { User } from "@supabase/supabase-js";

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

// NOTE: withRole / withAuth have been moved to lib/auth-server.ts to keep
// this module free of server-only imports (next/headers) so it can be safely
// imported by client components.
