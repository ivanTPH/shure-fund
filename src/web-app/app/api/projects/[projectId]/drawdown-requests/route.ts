/**
 * GET  /api/projects/[projectId]/drawdown-requests — list requests
 * POST /api/projects/[projectId]/drawdown-requests — create request
 *
 * A drawdown request is a formal ask from the funder (or admin) to draw down
 * funds from the Tier 2 proof-of-funds bank account into the Tier 1 trust wallet.
 *
 * GET:  funder, developer, admin
 * POST: funder, admin only (contractors/commercial cannot request drawdowns)
 *
 * POST body: { amount: number, description?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer" && role !== "funder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("drawdown_requests")
    .select(`
      id, amount, description, status, created_at, reviewed_at, review_notes,
      requester:users!requested_by ( id, full_name, email ),
      reviewer:users!reviewed_by   ( id, full_name, email )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending   = (data ?? []).filter((r) => r.status === "pending");
  const approved  = (data ?? []).filter((r) => r.status === "approved");
  const totalApproved = approved.reduce((s, r) => s + Number(r.amount), 0);

  return NextResponse.json({ requests: data ?? [], pending, totalApproved });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "funder") {
    return NextResponse.json({ error: "Only funder and admin can create drawdown requests." }, { status: 403 });
  }

  let body: { amount?: number; description?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, description } = body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data: inserted, error: insertErr } = await service
    .from("drawdown_requests")
    .insert({
      project_id:   projectId,
      requested_by: user.id,
      amount:       Number(amount),
      description:  description?.trim() ?? null,
    })
    .select(`
      id, amount, description, status, created_at,
      requester:users!requested_by ( id, full_name, email )
    `)
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ request: inserted }, { status: 201 });
}
