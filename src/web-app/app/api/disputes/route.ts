/**
 * GET /api/disputes            — cross-project dispute list (stageId optional)
 * GET /api/disputes?stageId=  — disputes for a specific stage
 * POST /api/disputes           — raise a new dispute
 *
 * Query params (cross-project mode):
 *   ?status=raised|under_review|resolved|all  (default: all)
 *   ?projectId=<uuid>  scope to one project
 *   ?limit=<n>         max results (default: 100)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { notifyDisputeRaised } from "@/lib/notifications/notificationService";

const VALID_STATUSES = ["raised", "under_review", "resolved"] as const;
type DisputeStatus = (typeof VALID_STATUSES)[number];

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const stageId     = searchParams.get("stageId");
  const statusParam = searchParams.get("status") ?? "all";
  const projectParam = searchParams.get("projectId") ?? null;
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 200);

  // ── Single-stage mode (legacy) ────────────────────────────────────────────
  if (stageId) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("disputes")
      .select(`id, reason, status, disputed_value, created_at, resolution_notes,
               raiser:users!raised_by ( id, full_name, role ),
               respondent:users!respondent_id ( id, full_name, role )`)
      .eq("stage_id", stageId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ disputes: data ?? [] });
  }

  // ── Cross-project mode ────────────────────────────────────────────────────
  if (statusParam !== "all" && !VALID_STATUSES.includes(statusParam as DisputeStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: all, ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Determine accessible project IDs
  let allowedProjectIds: Set<string> | null;
  if (role === "admin") {
    allowedProjectIds = null; // all projects
  } else if (role === "contractor") {
    const { data: c1 } = await service
      .from("contracts").select("project_id").eq("contractor_id", user.id);
    const { data: c2 } = await service
      .from("project_members").select("project_id").eq("user_id", user.id);
    allowedProjectIds = new Set([
      ...(c1 ?? []).map((c) => c.project_id),
      ...(c2 ?? []).map((m) => m.project_id),
    ]);
  } else {
    const { data } = await service
      .from("project_members").select("project_id").eq("user_id", user.id);
    allowedProjectIds = new Set((data ?? []).map((m) => m.project_id));
  }

  let query = service
    .from("disputes")
    .select(`
      id, reason, status, disputed_value, created_at, resolution_notes,
      stage_id,
      stage:contract_stages!disputes_stage_id_fkey (
        id, name,
        contract:contracts!contract_stages_contract_id_fkey (
          id, project_id,
          project:projects!contracts_project_id_fkey ( id, name )
        )
      ),
      raiser:users!raised_by ( id, full_name, role )
    `)
    .order("created_at", { ascending: false });

  if (statusParam !== "all") {
    query = query.eq("status", statusParam as DisputeStatus);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const disputes: Array<{
    id: string; reason: string; status: string; disputedValue: number;
    createdAt: string; resolutionNotes: string | null;
    stageId: string; stageName: string | null;
    contractId: string | null; projectId: string | null; projectName: string | null;
    raiserId: string | null; raiserName: string | null;
  }> = [];

  for (const d of data ?? []) {
    const stage    = Array.isArray(d.stage) ? d.stage[0] : d.stage;
    const contract = stage ? (Array.isArray(stage.contract) ? stage.contract[0] : stage.contract) : null;
    const project  = contract ? (Array.isArray(contract.project) ? contract.project[0] : contract.project) : null;
    const projectId = project?.id ?? null;

    if (allowedProjectIds !== null && (!projectId || !allowedProjectIds.has(projectId))) continue;
    if (projectParam && projectId !== projectParam) continue;

    const raiser = Array.isArray(d.raiser) ? d.raiser[0] : d.raiser;

    disputes.push({
      id:              d.id,
      reason:          d.reason,
      status:          d.status,
      disputedValue:   Number(d.disputed_value),
      createdAt:       d.created_at,
      resolutionNotes: d.resolution_notes ?? null,
      stageId:         d.stage_id,
      stageName:       stage?.name ?? null,
      contractId:      contract?.id ?? null,
      projectId,
      projectName:     project?.name ?? null,
      raiserId:        raiser?.id ?? null,
      raiserName:      raiser?.full_name ?? null,
    });

    if (disputes.length >= limit) break;
  }

  const summary = {
    total:        disputes.length,
    raised:       disputes.filter((d) => d.status === "raised").length,
    under_review: disputes.filter((d) => d.status === "under_review").length,
    resolved:     disputes.filter((d) => d.status === "resolved").length,
  };

  return NextResponse.json({ disputes, summary });
}

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "No role assigned" }, { status: 403 });

  let body: { stageId: string; reason: string; disputedValue: number; evidenceUrl?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageId, reason, disputedValue, evidenceUrl } = body;
  if (!stageId) return NextResponse.json({ error: "stageId required" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  if (!disputedValue || isNaN(Number(disputedValue)) || Number(disputedValue) <= 0) {
    return NextResponse.json({ error: "Disputed value must be a positive number" }, { status: 400 });
  }

  const service = createServiceClient();

  // Get stage → contract → project
  const { data: stage } = await service
    .from("contract_stages")
    .select("id, name, contracts!inner ( id, project_id )")
    .eq("id", stageId)
    .single();

  const contract = Array.isArray(stage?.contracts) ? stage.contracts[0] : stage?.contracts;
  const projectId = contract?.project_id ?? null;
  const contractId = contract?.id ?? null;

  const { data: dispute, error } = await service
    .from("disputes")
    .insert({
      stage_id:       stageId,
      raised_by:      user.id,
      reason:         reason.trim(),
      disputed_value: Number(disputedValue),
      evidence_url:   evidenceUrl ?? null,
      status:         "raised",
    })
    .select("id")
    .single();

  if (error || !dispute) return NextResponse.json({ error: error?.message ?? "Failed to create dispute" }, { status: 500 });

  // Transition stage to 'disputed' if it is currently in a disputable state
  await service
    .from("contract_stages")
    .update({ status: "disputed" })
    .eq("id", stageId)
    .in("status", ["in_progress", "awaiting_approval"]);

  // Audit trail
  try {
    if (projectId) {
      await service.from("audit_events").insert({
        project_id: projectId,
        stage_id:   stageId,
        actor_id:   user.id,
        action:     "dispute_opened",
        to_state:   "raised",
        metadata:   { dispute_id: dispute.id, disputed_value: Number(disputedValue), reason: reason.trim() },
      });
    }
  } catch { /* non-fatal */ }

  // Notify
  try {
    if (projectId) {
      await notifyDisputeRaised(service, projectId, stageId, stage?.name ?? stageId, contractId, dispute.id);
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ dispute }, { status: 201 });
}
