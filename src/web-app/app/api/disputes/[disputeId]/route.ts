/**
 * GET  /api/disputes/[disputeId]  — fetch dispute detail
 * PATCH /api/disputes/[disputeId] — update status (respond/resolve/escalate)
 *   Body: { action: "respond" | "resolve" | "escalate", notes?: string }
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { notifyDisputeResolved } from "@/lib/notifications/notificationService";

type RouteContext = { params: Promise<{ disputeId: string }> };

const TRANSITIONS: Record<string, { to: string; allowedRoles: string[] }> = {
  respond:  { to: "under_review",  allowedRoles: ["commercial", "developer", "admin"] },
  resolve:  { to: "resolved",      allowedRoles: ["commercial", "developer", "admin"] },
  escalate: { to: "escalated",     allowedRoles: ["developer", "admin"] },
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { disputeId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("disputes")
    .select(`id, reason, status, resolution_notes, evidence_url, created_at,
             raiser:users!raised_by ( id, full_name, role ),
             respondent:users!respondent_id ( id, full_name, role ),
             stage:contract_stages!stage_id ( id, name, contracts!inner ( project_id, projects!inner ( name ) ) )`)
    .eq("id", disputeId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
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
    return NextResponse.json({ error: `Role '${role}' cannot perform action '${action}'` }, { status: 403 });
  }

  const service = createServiceClient();

  // Load dispute
  const { data: dispute } = await service
    .from("disputes")
    .select("id, status, stage_id, stage:contract_stages!stage_id ( name, contracts!inner ( project_id ) )")
    .eq("id", disputeId)
    .single();

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const update: Record<string, unknown> = { status: rule.to };
  if (notes) update.resolution_notes = notes;
  if (action === "respond" || action === "resolve") update.respondent_id = user.id;

  const { error: updateErr } = await service.from("disputes").update(update).eq("id", disputeId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Notify on resolve
  if (rule.to === "resolved") {
    try {
      const stg = Array.isArray(dispute.stage) ? dispute.stage[0] : dispute.stage;
      const contract = Array.isArray(stg?.contracts) ? stg.contracts[0] : stg?.contracts;
      await notifyDisputeResolved(service, dispute.stage_id, stg?.name ?? dispute.stage_id, contract?.project_id ?? null);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, to: rule.to });
}
