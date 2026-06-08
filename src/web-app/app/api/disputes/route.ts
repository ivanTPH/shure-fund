/**
 * GET /api/disputes?stageId=  — list disputes for a stage
 * POST /api/disputes           — raise a new dispute
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { notifyDisputeRaised } from "@/lib/notifications/notificationService";

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stageId = req.nextUrl.searchParams.get("stageId");
  if (!stageId) return NextResponse.json({ error: "stageId required" }, { status: 400 });

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
