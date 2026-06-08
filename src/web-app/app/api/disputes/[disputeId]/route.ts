/**
 * GET  /api/disputes/[disputeId]  — fetch dispute detail
 * PATCH /api/disputes/[disputeId] — respond/resolve/escalate
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { notifyDisputeResolved } from "@/lib/notifications/notificationService";

type RouteContext = { params: Promise<{ disputeId: string }> };

const TRANSITIONS: Record<string, { to: string; allowedRoles: string[] }> = {
  respond:  { to: "under_review", allowedRoles: ["funder", "commercial", "developer", "admin"] },
  resolve:  { to: "resolved",     allowedRoles: ["funder", "developer", "admin"] },
  escalate: { to: "escalated",    allowedRoles: ["developer", "admin"] },
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { disputeId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("disputes")
    .select(`id, reason, status, disputed_value, resolution_notes, evidence_url, created_at,
             raiser:users!raised_by ( id, full_name, role ),
             respondent:users!respondent_id ( id, full_name, role ),
             stage:contract_stages!stage_id (
               id, name,
               contracts!inner ( id, project_id, projects!inner ( id, name ) ),
               evidence ( id, name, file_url, file_type, status, notes, uploaded_at,
                          uploader:users!uploaded_by ( id, full_name, role ) )
             )`)
    .eq("id", disputeId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  // Generate signed URLs for stage evidence
  const stage = Array.isArray(data.stage) ? data.stage[0] : data.stage;
  if (stage && Array.isArray(stage.evidence)) {
    const withSignedUrls = await Promise.all(
      stage.evidence.map(async (ev: { id: string; file_url: string; [key: string]: unknown }) => {
        const { data: signed } = await service.storage
          .from("evidence")
          .createSignedUrl(ev.file_url, 3600);
        return { ...ev, signedUrl: signed?.signedUrl ?? null };
      })
    );
    if (Array.isArray(data.stage)) {
      (data as unknown as Record<string, unknown>).stage = [{ ...stage, evidence: withSignedUrls }];
    } else {
      (data as unknown as Record<string, unknown>).stage = { ...stage, evidence: withSignedUrls };
    }
  }

  return NextResponse.json({ dispute: data });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "No role assigned" }, { status: 403 });

  const { disputeId } = await context.params;
  let body: { action: string; notes?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, notes } = body;
  const rule = TRANSITIONS[action];
  if (!rule) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (!rule.allowedRoles.includes(role)) {
    return NextResponse.json({ error: `Role '${role}' cannot perform '${action}'` }, { status: 403 });
  }

  const service = createServiceClient();

  const { data: dispute } = await service
    .from("disputes")
    .select(`id, status, stage_id,
             stage:contract_stages!stage_id ( name, contracts!inner ( id, project_id ) )`)
    .eq("id", disputeId)
    .single();

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const update: Record<string, unknown> = { status: rule.to };
  if (notes) update.resolution_notes = notes;
  if (action === "respond" || action === "resolve") {
    update.respondent_id = user.id;
    if (action === "resolve") update.resolved_by = user.id;
  }

  const { error: updateErr } = await service.from("disputes").update(update).eq("id", disputeId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  if (rule.to === "resolved") {
    try {
      const stg = Array.isArray(dispute.stage) ? dispute.stage[0] : dispute.stage;
      const contract = Array.isArray(stg?.contracts) ? stg.contracts[0] : stg?.contracts;
      const projectId = contract?.project_id ?? null;
      const contractId = contract?.id ?? null;
      if (projectId) {
        await service.from("audit_events").insert({
          project_id: projectId,
          stage_id:   dispute.stage_id,
          actor_id:   user.id,
          action:     "dispute_resolved",
          from_state: dispute.status,
          to_state:   "resolved",
          metadata:   { dispute_id: disputeId, notes: notes ?? null },
        });
        await notifyDisputeResolved(service, projectId, dispute.stage_id, stg?.name ?? dispute.stage_id, contractId, disputeId);
      }
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, to: rule.to });
}
