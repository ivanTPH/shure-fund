/**
 * PATCH /api/projects/[projectId]/drawdown-requests/[reqId]
 *
 * Approve, reject, or withdraw a drawdown request.
 *
 * Body: { action: "approve" | "reject" | "withdraw", reviewNotes?: string }
 *
 * approve / reject: admin only (or funder acting as treasury)
 * withdraw:         the original requester or admin
 *
 * Idempotency: already-actioned requests return 409.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string; reqId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; reviewNotes?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, reviewNotes } = body;
  if (!action || !["approve", "reject", "withdraw"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, or withdraw." }, { status: 400 });
  }

  const { projectId, reqId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Fetch the request
  const { data: existing } = await service
    .from("drawdown_requests")
    .select("id, status, requested_by, project_id")
    .eq("id", reqId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Drawdown request not found." }, { status: 404 });
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Request is already '${existing.status}' and cannot be actioned.` },
      { status: 409 },
    );
  }

  const role = getRole(user);

  // Permission check per action
  if (action === "approve" || action === "reject") {
    if (role !== "admin" && role !== "funder") {
      return NextResponse.json({ error: "Only admin or funder can approve/reject drawdown requests." }, { status: 403 });
    }
  }
  if (action === "withdraw") {
    if (role !== "admin" && existing.requested_by !== user.id) {
      return NextResponse.json({ error: "Only the original requester or admin can withdraw a request." }, { status: 403 });
    }
  }

  const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "withdrawn";
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (action !== "withdraw") {
    updatePayload.reviewed_by  = user.id;
    updatePayload.reviewed_at  = now;
    updatePayload.review_notes = reviewNotes?.trim() ?? null;
  }

  const { data: updated, error: updateErr } = await service
    .from("drawdown_requests")
    .update(updatePayload)
    .eq("id", reqId)
    .select(`
      id, amount, description, status, created_at, reviewed_at, review_notes,
      requester:users!requested_by ( id, full_name, email ),
      reviewer:users!reviewed_by   ( id, full_name, email )
    `)
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ request: updated });
}
