import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// PATCH /api/admin/compliance/[reviewId] — approve / reject / escalate
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;
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

  const body = await req.json();
  const { status, reviewer_notes } = body;

  const validStatuses = ["approved", "rejected", "escalated"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "status must be one of: approved, rejected, escalated" },
      { status: 400 }
    );
  }

  // Fetch the review to confirm it exists and is still pending
  const { data: review } = await supabase
    .from("compliance_reviews")
    .select("id, status, entity_type, entity_id, triggered_by")
    .eq("id", reviewId)
    .single();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (review.status !== "pending") {
    return NextResponse.json(
      { error: `Review is already ${review.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("compliance_reviews")
    .update({
      status,
      reviewer_id:    user.id,
      reviewer_notes: reviewer_notes ?? null,
      resolved_at:    now,
    })
    .eq("id", reviewId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Write audit event
  await supabase.from("audit_events").insert({
    entity_type:  "compliance_review",
    entity_id:    reviewId,
    action:       `compliance_${status}`,
    user_id:      user.id,
    before_state: { status: "pending" },
    after_state:  { status, reviewer_notes },
  });

  return NextResponse.json({ reviewId, status });
}
