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

  // Write audit event — correct column names and enum values (added in migration 015)
  const actionMap: Record<string, string> = {
    approved:  "compliance_approved",
    rejected:  "compliance_rejected",
    escalated: "compliance_escalated",
  };
  await supabase.from("audit_events").insert({
    actor_id:   user.id,
    action:     actionMap[status] ?? "compliance_approved",
    from_state: "pending",
    to_state:   status,
    metadata:   {
      review_id:      reviewId,
      entity_type:    review.entity_type,
      entity_id:      review.entity_id,
      reviewer_notes: reviewer_notes ?? null,
    },
  });

  return NextResponse.json({ reviewId, status });
}
