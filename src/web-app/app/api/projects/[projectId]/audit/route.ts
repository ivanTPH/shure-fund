/**
 * GET /api/projects/[projectId]/audit
 *
 * Returns all audit events for a project, newest first.
 * Restricted to funder, developer, and admin roles.
 *
 * Query params:
 *   stageId?   — filter to a specific stage
 *   action?    — filter to a specific audit_action value
 *   limit?     — max records (default 200)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

const ALLOWED_ROLES = ["funder", "developer", "admin"] as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  // Auth + role check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !(ALLOWED_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json(
      { error: "Audit trail is restricted to funder, developer, and admin roles." },
      { status: 403 },
    );
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const filterStageId = params.get("stageId");
  const filterAction = params.get("action");
  const limit = Math.min(Number(params.get("limit") ?? "200"), 500);

  let query = service
    .from("audit_events")
    .select(`
      id, project_id, stage_id, action, from_state, to_state, metadata, created_at,
      stage:contract_stages!stage_id ( name ),
      actor:users!actor_id ( full_name, role )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterStageId) query = query.eq("stage_id", filterStageId);
  if (filterAction) query = query.eq("action", filterAction);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data ?? []).map((row) => ({
    id: row.id,
    stageId: row.stage_id,
    stageName: (Array.isArray(row.stage) ? row.stage[0] : row.stage)?.name ?? null,
    action: row.action,
    fromState: row.from_state,
    toState: row.to_state,
    metadata: row.metadata,
    createdAt: row.created_at,
    actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
  }));

  return NextResponse.json({ events, total: events.length });
}
