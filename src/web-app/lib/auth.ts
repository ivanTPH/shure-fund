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
 *
 * Role semantics:
 *   funder     — the money source; controls the project wallet and triggers payment release.
 *                Funder-role members are trust co-beneficiaries paid simultaneously on each stage release.
 *   developer  — the property developer / project owner / client who commissions the work.
 *                Often the same entity as the funder in self-funded developments (assign funder role in that case).
 *   contractor — executes building work; submits evidence; paid from the trust wallet.
 *                Covers both main contractors and sub-contractors — all payments flow through the trust.
 *   commercial — commercial manager / cost controller; first in the approval chain.
 *   consultant — professional consultant / QS; maps to the 'professional' approval_role in the DB.
 *   admin      — platform administrator; can act for any role.
 *
 * DB-only roles (not in AppRole, handled by EXTENDED_ROLE_LABELS below):
 *   professional   — DB approval_role value; displayed as "Consultant" (same as app 'consultant')
 *   treasury       — DB approval_role value; displayed as "Funder / Project Owner"
 *   subcontractor  — reserved in DB enum; treated as 'contractor' in the app
 *   quantity_surveyor — reserved in DB enum; no distinct app role
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  admin:      "Admin",
  funder:     "Funder",
  developer:  "Project Owner",
  contractor: "Contractor",
  commercial: "Commercial",
  consultant: "Consultant",
};

/**
 * Extended label map — includes DB-only role values that may appear in audit
 * events or legacy data. Falls back to ROLE_LABELS for AppRole values.
 */
export const EXTENDED_ROLE_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  professional:      "Consultant",           // DB approval_role → maps to app 'consultant'
  treasury:          "Funder / Project Owner", // DB approval_role → maps to funder + developer
  subcontractor:     "Contractor",           // DB enum, treated as contractor
  quantity_surveyor: "Quantity Surveyor",    // DB enum, reserved
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
