import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// GET /api/admin/compliance/kyc — list pending KYC submissions (admin only)
// ---------------------------------------------------------------------------
export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: submissions, error } = await supabase
    .from("kyc_submissions")
    .select(`
      id, created_at, status, document_type, document_number, document_expiry,
      full_name, date_of_birth, nationality,
      address_line1, city, postcode, country,
      source_of_funds, reviewer_notes, reviewed_at,
      user_id
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user info
  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, role, kyc_status")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  const enriched = submissions.map((s) => ({
    ...s,
    user: userMap[s.user_id] ?? null,
  }));

  return NextResponse.json({ submissions: enriched });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/compliance/kyc — approve or reject a KYC submission
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { submissionId, status, reviewer_notes, kyc_tier } = body;

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  const { data: submission } = await supabase
    .from("kyc_submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json({ error: `Already ${submission.status}` }, { status: 409 });
  }

  const now = new Date().toISOString();

  // Update submission
  await supabase
    .from("kyc_submissions")
    .update({ status, reviewer_id: user.id, reviewer_notes, reviewed_at: now })
    .eq("id", submissionId);

  // Update user KYC status
  const kycExpiry = status === "approved"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await supabase
    .from("users")
    .update({
      kyc_status:      status === "approved" ? "approved" : "rejected",
      kyc_tier:        kyc_tier ?? "standard",
      kyc_reviewed_at: now,
      kyc_expires_at:  kycExpiry,
      kyc_notes:       reviewer_notes ?? null,
    })
    .eq("id", submission.user_id);

  // Audit event
  await supabase.from("audit_events").insert({
    entity_type:  "kyc_submission",
    entity_id:    submissionId,
    action:       `kyc_${status}`,
    user_id:      user.id,
    before_state: { status: "pending" },
    after_state:  { status, kyc_tier: kyc_tier ?? "standard" },
  });

  return NextResponse.json({ submissionId, status });
}
