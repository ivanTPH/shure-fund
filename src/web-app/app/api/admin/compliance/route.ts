import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// GET /api/admin/compliance — list compliance reviews (admin only)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify admin role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const query = supabase
    .from("compliance_reviews")
    .select(`
      id, created_at, resolved_at, rule_id, rule_label, risk_level,
      status, entity_type, entity_id, context, reviewer_notes,
      triggered_by, reviewer_id
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query.eq("status", status);
  }

  const { data: reviews, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with triggered_by user info
  const userIds = [
    ...new Set([
      ...reviews.map((r) => r.triggered_by).filter(Boolean),
      ...reviews.map((r) => r.reviewer_id).filter(Boolean),
    ]),
  ];

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  const enriched = reviews.map((r) => ({
    ...r,
    triggered_by_user: r.triggered_by ? userMap[r.triggered_by] : null,
    reviewer_user:     r.reviewer_id  ? userMap[r.reviewer_id]  : null,
  }));

  return NextResponse.json({ reviews: enriched });
}

// ---------------------------------------------------------------------------
// GET /api/admin/compliance/kyc — list pending KYC submissions (admin only)
// ---------------------------------------------------------------------------
// Note: this is handled as a query param variant of the same route
// Use GET /api/admin/compliance?type=kyc to list kyc submissions
