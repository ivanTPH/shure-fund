/**
 * GET /api/variations/[variationId]  — fetch single variation with full detail
 *
 * PATCH /api/variations/[variationId]  — generic status transition
 *   Body: { action: VariationAction, reason?: string }
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import {
  validateVariationTransition,
  type VariationAction,
  type VariationStatus,
} from "@/lib/workflow/variationStateMachine";
import {
  notifyVariationSubmitted,
  notifyVariationApproved,
  notifyVariationRejected,
} from "@/lib/notifications/notificationService";

type RouteContext = { params: Promise<{ variationId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { variationId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("variations")
    .select(`id, stage_id, description, value_change, status, approved_at, created_at,
             requester:users!requested_by ( id, full_name, role ),
             approver:users!approved_by ( id, full_name, role ),
             stage:contract_stages!stage_id ( id, name, value, status,
               contracts!inner ( project_id, projects!inner ( name ) ) )`)
    .eq("id", variationId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Variation not found" }, { status: 404 });

  // Fetch wallet for financial details on the detail page
  const stgForWallet = Array.isArray(data.stage) ? data.stage[0] : data.stage;
  const contractForWallet = Array.isArray(stgForWallet?.contracts) ? stgForWallet.contracts[0] : stgForWallet?.contracts;
  const projectIdForWallet = contractForWallet?.project_id;
  let wallet = null;
  if (projectIdForWallet) {
    const { data: walletData } = await service
      .from("wallets")
      .select("balance, available_amount, ringfenced_amount")
      .eq("project_id", projectIdForWallet)
      .single();
    wallet = walletData;
  }

  return NextResponse.json({ variation: data, wallet });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "No role assigned" }, { status: 403 });

  const { variationId } = await context.params;
  let body: { action: VariationAction; reason?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, reason } = body;
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  const service = createServiceClient();

  // Load current variation + wallet info
  const { data: variation, error: vErr } = await service
    .from("variations")
    .select(`id, stage_id, status, value_change, requested_by,
             stage:contract_stages!stage_id ( id, name, value,
               contracts!inner ( id, project_id ) )`)
    .eq("id", variationId)
    .single();

  if (vErr || !variation) return NextResponse.json({ error: "Variation not found" }, { status: 404 });

  // Validate transition
  const validation = validateVariationTransition(action, variation.status as VariationStatus, role);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 403 });

  const { rule } = validation;

  // Wallet check for activation actions
  if (rule.requiresWalletCheck) {
    const stg = Array.isArray(variation.stage) ? variation.stage[0] : variation.stage;
    const contract = Array.isArray(stg?.contracts) ? stg.contracts[0] : stg?.contracts;
    const projectId = contract?.project_id;

    if (projectId) {
      const { data: wallet } = await service
        .from("wallets")
        .select("available_amount")
        .eq("project_id", projectId)
        .single();

      const needed = Number(variation.value_change);
      const available = Number(wallet?.available_amount ?? 0);
      if (needed > 0 && available < needed) {
        const shortfall = needed - available;

        // Auto-transition: variation → pending_funding, stage → funding_gap
        if (variation.status === "approved") {
          await service.from("variations").update({ status: "pending_funding" }).eq("id", variationId);
        }
        await service.from("contract_stages").update({ status: "funding_gap" }).eq("id", variation.stage_id);

        return NextResponse.json({
          error: `Insufficient wallet funds. Available: £${available.toLocaleString()}, needed: £${needed.toLocaleString()}, shortfall: £${shortfall.toLocaleString()}. Variation moved to pending_funding; stage flagged as funding_gap.`,
          shortfall,
          available,
          needed,
        }, { status: 402 });
      }
    }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = { status: rule.to };
  if (rule.to === "approved" || rule.to === "active") {
    updatePayload.approved_by = user.id;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { error: updateErr } = await service
    .from("variations")
    .update(updatePayload)
    .eq("id", variationId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If activating — update stage value
  if (rule.to === "active") {
    const stg = Array.isArray(variation.stage) ? variation.stage[0] : variation.stage;
    const newValue = Number(stg?.value ?? 0) + Number(variation.value_change);
    await service
      .from("contract_stages")
      .update({ value: newValue })
      .eq("id", variation.stage_id);
  }

  // Fire notifications
  try {
    const stg = Array.isArray(variation.stage) ? variation.stage[0] : variation.stage;
    const contract = Array.isArray(stg?.contracts) ? stg.contracts[0] : stg?.contracts;
    const projectId = contract?.project_id ?? null;
    const contractId = contract?.id ?? null;
    const stageName = stg?.name ?? variationId;

    if (rule.to === "submitted") {
      await notifyVariationSubmitted(service, projectId, variation.stage_id, stageName, contractId, variationId, Number(variation.value_change));
    } else if (rule.to === "approved") {
      await notifyVariationApproved(service, projectId, variation.stage_id, stageName, contractId, variationId, variation.requested_by as string);
    } else if (rule.to === "rejected") {
      await notifyVariationRejected(service, projectId, variation.stage_id, stageName, contractId, variationId, variation.requested_by as string);
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, from: variation.status, to: rule.to, action, reason: reason ?? null });
}
