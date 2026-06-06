/**
 * GET /api/token-payments
 *
 * Returns token payment records for the authenticated user.
 * Optionally scoped to a project with ?projectId=<uuid>.
 *
 * Roles:
 *   Any authenticated user — sees their own payments (own_read RLS).
 *   Funder / developer / admin on a project — may also pass ?projectId
 *   to see all distributions for that project (project_read RLS).
 *
 * Response:
 *   { payments: TokenPayment[], summary: { total, count, projectCount } }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  const projectId = req.nextUrl.searchParams.get("projectId");
  const service = createServiceClient();

  let query = service
    .from("token_payments")
    .select(`
      id, amount, share_pct, reference, paid_at, created_at,
      project_id, stage_id, user_id,
      project:projects!project_id ( id, name, address ),
      stage:contract_stages!stage_id ( id, name, value )
    `)
    .order("paid_at", { ascending: false });

  if (projectId) {
    // Project-scoped view — caller must be funder/developer/admin on that project
    const allowed = ["funder", "developer", "admin"];
    if (!allowed.includes(role ?? "")) {
      return NextResponse.json(
        { error: "Only funders, project owners, and admins can view project distributions." },
        { status: 403 },
      );
    }
    query = query.eq("project_id", projectId);
  } else {
    // Personal view — only the user's own payments
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payments = (data ?? []).map((r) => ({
    id:         r.id,
    amount:     Number(r.amount),
    sharePct:   r.share_pct != null ? Number(r.share_pct) : null,
    reference:  r.reference,
    paidAt:     r.paid_at,
    projectId:  r.project_id,
    stageId:    r.stage_id,
    userId:     r.user_id,
    projectName: (Array.isArray(r.project) ? r.project[0] : r.project)?.name ?? null,
    projectAddress: (Array.isArray(r.project) ? r.project[0] : r.project)?.address ?? null,
    stageName:  (Array.isArray(r.stage) ? r.stage[0] : r.stage)?.name ?? null,
  }));

  const total        = payments.reduce((s, p) => s + p.amount, 0);
  const projectIds   = new Set(payments.map((p) => p.projectId));

  return NextResponse.json({
    payments,
    summary: {
      total,
      count:        payments.length,
      projectCount: projectIds.size,
    },
  });
}
