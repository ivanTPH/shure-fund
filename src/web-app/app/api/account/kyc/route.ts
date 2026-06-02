import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// GET /api/account/kyc — return current user's KYC status + latest submission
// ---------------------------------------------------------------------------
export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("users")
    .select("kyc_status, kyc_tier, kyc_submitted_at, kyc_reviewed_at, kyc_expires_at, kyc_notes")
    .eq("id", user.id)
    .single();

  const { data: latestSubmission } = await supabase
    .from("kyc_submissions")
    .select("id, created_at, status, reviewer_notes, document_type, full_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ profile, latestSubmission });
}

// ---------------------------------------------------------------------------
// POST /api/account/kyc — submit KYC form
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const required = [
    "full_name", "date_of_birth", "nationality",
    "address_line1", "city", "postcode",
    "document_type", "document_number", "document_expiry",
    "source_of_funds",
  ] as const;

  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const validDocTypes = ["passport", "driving_licence", "national_id"];
  if (!validDocTypes.includes(body.document_type)) {
    return NextResponse.json({ error: "Invalid document_type" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for existing pending submission — don't allow duplicates
  const { data: existing } = await supabase
    .from("kyc_submissions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a KYC submission under review." },
      { status: 409 }
    );
  }

  const { data: submission, error: insertError } = await supabase
    .from("kyc_submissions")
    .insert({
      user_id:          user.id,
      full_name:        body.full_name,
      date_of_birth:    body.date_of_birth,
      nationality:      body.nationality,
      address_line1:    body.address_line1,
      address_line2:    body.address_line2 ?? null,
      city:             body.city,
      postcode:         body.postcode,
      country:          body.country ?? "GB",
      document_type:    body.document_type,
      document_number:  body.document_number,
      document_expiry:  body.document_expiry,
      source_of_funds:  body.source_of_funds,
      source_of_wealth: body.source_of_wealth ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[KYC] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Failed to submit KYC" }, { status: 500 });
  }

  // Update user kyc_status to pending_review
  await supabase
    .from("users")
    .update({ kyc_status: "pending_review", kyc_submitted_at: new Date().toISOString() })
    .eq("id", user.id);

  // Write audit event
  await supabase.from("audit_events").insert({
    entity_type:  "kyc_submission",
    entity_id:    submission.id,
    action:       "submitted",
    user_id:      user.id,
    after_state:  { kyc_status: "pending_review" },
  });

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
