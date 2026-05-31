/**
 * Evidence review API
 *
 * PATCH /api/evidence/[id]
 *   Body: { status: 'accepted' | 'rejected' | 'requires_more', notes?: string }
 *   Allowed roles: commercial, professional, consultant, funder, developer, admin
 *   Updates the evidence status and optional review notes.
 *   The DB trigger on evidence.status fires automatically and writes to audit_events.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

const REVIEWER_ROLES = ["commercial", "professional", "consultant", "funder", "developer", "admin"];
const VALID_STATUSES = ["accepted", "rejected", "requires_more", "pending"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !REVIEWER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden — reviewers only" }, { status: 403 });
  }

  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, notes } = body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const { id } = await params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("evidence")
    .update({ status, notes: notes?.trim() || null, reviewer_id: user.id })
    .eq("id", id)
    .select("id, status, notes")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evidence: data });
}
