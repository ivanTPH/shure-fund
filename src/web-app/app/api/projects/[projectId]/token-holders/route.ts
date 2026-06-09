/**
 * GET  /api/projects/[projectId]/token-holders  — list token holders
 * POST /api/projects/[projectId]/token-holders  — add a token holder
 *
 * A token holder is a trust co-beneficiary who receives a proportional share
 * of each stage payment at the point of release.
 *
 * Role restrictions:
 *   GET  — funder, developer, admin
 *   POST — admin, developer only
 *
 * POST body: { userId: string, sharePct: number, label?: string }
 * Validation: sharePct must be > 0, ≤ 100, and combined total for the project ≤ 100%.
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
    .from("project_token_holders")
    .select(`
      id, share_pct, label, created_at,
      user:users!user_id ( id, full_name, email, role )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalSharePct = (data ?? []).reduce((sum, h) => sum + Number(h.share_pct), 0);

  return NextResponse.json({ holders: data ?? [], totalSharePct });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Only admin and developer can manage token holders." }, { status: 403 });
  }

  let body: { userId?: string; sharePct?: number; label?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, sharePct, label } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (sharePct == null || isNaN(Number(sharePct)) || Number(sharePct) <= 0 || Number(sharePct) > 100) {
    return NextResponse.json({ error: "sharePct must be a number between 0 and 100 (exclusive of 0)." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Check that the target user exists
  const { data: targetUser } = await service
    .from("users")
    .select("id, full_name, email")
    .eq("id", userId.trim())
    .maybeSingle();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Check combined share total won't exceed 100%
  const { data: existing } = await service
    .from("project_token_holders")
    .select("share_pct")
    .eq("project_id", projectId);

  const currentTotal = (existing ?? []).reduce((sum, h) => sum + Number(h.share_pct), 0);
  if (currentTotal + Number(sharePct) > 100) {
    return NextResponse.json(
      { error: `Adding ${sharePct}% would exceed 100% total (currently ${currentTotal.toFixed(2)}% allocated).` },
      { status: 422 },
    );
  }

  const { data: inserted, error: insertErr } = await service
    .from("project_token_holders")
    .insert({
      project_id: projectId,
      user_id:    userId.trim(),
      share_pct:  Number(sharePct),
      label:      label?.trim() ?? null,
      created_by: user.id,
    })
    .select(`
      id, share_pct, label, created_at,
      user:users!user_id ( id, full_name, email, role )
    `)
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "This user is already a token holder on this project." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ holder: inserted }, { status: 201 });
}
