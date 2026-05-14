import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth, withRole, getRole, ROLE_LABELS } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

/**
 * GET /api/test — public health check, no auth required.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", message: "API working" });
}

/**
 * POST /api/test — requires any authenticated user.
 * Returns the caller's identity to verify the auth pipeline.
 */
export const POST = withAuth(async (_req: NextRequest, _ctx: unknown, user: User) => {
  const role = getRole(user);
  return NextResponse.json({
    status: "ok",
    userId: user.id,
    email: user.email,
    role,
    roleLabel: role ? ROLE_LABELS[role] : null,
  });
});

/**
 * DELETE /api/test — restricted to Admin only.
 * Demonstrates a role-restricted endpoint using withRole().
 */
export const DELETE = withRole("admin")(
  async (_req: NextRequest, _ctx: unknown, user: User) => {
    return NextResponse.json({
      status: "ok",
      message: `Admin action authorised for ${user.email}`,
    });
  },
);
