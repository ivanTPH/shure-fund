/**
 * GET  /api/projects/[projectId]/contracts/[contractId]/stages/[stageId]
 * PATCH /api/projects/[projectId]/contracts/[contractId]/stages/[stageId]
 *
 * GET  — fetch a single stage (admin/developer only).
 * PATCH — edit a stage. Only permitted for draft/sent stages (admin/developer).
 *
 * PATCH body (all optional, at least one required):
 *   name, value, description, startDate, endDate
 *
 * Side-effect: if value changes, updates contract.total_value accordingly.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ projectId: string; contractId: string; stageId: string }>;
};

const EDITABLE_STATUSES = ["draft", "sent"];

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { projectId, contractId, stageId } = await context.params;
  const service = createServiceClient();

  // Verify contract belongs to this project
  const { data: contract } = await service
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  const { data: stage } = await service
    .from("contract_stages")
    .select("id, name, description, value, status, start_date, end_date")
    .eq("id", stageId)
    .eq("contract_id", contractId)
    .maybeSingle();

  if (!stage) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  return NextResponse.json({ stage });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admin and developer can edit stages." }, { status: 403 });
  }

  let body: {
    name?: string;
    value?: number;
    description?: string;
    startDate?: string;
    endDate?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, value, description, startDate, endDate } = body;
  const hasUpdate = [name, value, description, startDate, endDate].some((v) => v !== undefined);
  if (!hasUpdate) {
    return NextResponse.json({ error: "At least one field must be provided." }, { status: 400 });
  }

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Stage name cannot be empty." }, { status: 400 });
  }
  if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
    return NextResponse.json({ error: "Stage value must be a positive number." }, { status: 400 });
  }

  const { projectId, contractId, stageId } = await context.params;
  const service = createServiceClient();

  // Verify contract belongs to this project
  const { data: contract } = await service
    .from("contracts")
    .select("id, total_value")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  // Fetch stage and verify it belongs to this contract
  const { data: stage } = await service
    .from("contract_stages")
    .select("id, name, value, status")
    .eq("id", stageId)
    .eq("contract_id", contractId)
    .maybeSingle();

  if (!stage) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  if (!EDITABLE_STATUSES.includes(stage.status)) {
    return NextResponse.json(
      { error: `Stage can only be edited in draft or sent status. Current status: ${stage.status}` },
      { status: 422 },
    );
  }

  // Build update payload
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (value !== undefined) updates.value = Number(value);
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (endDate !== undefined) updates.end_date = endDate || null;

  const { data: updatedStage, error: updateErr } = await service
    .from("contract_stages")
    .update(updates)
    .eq("id", stageId)
    .select("id, name, description, value, status, start_date, end_date")
    .single();

  if (updateErr || !updatedStage) {
    return NextResponse.json({ error: updateErr?.message ?? "Update failed." }, { status: 500 });
  }

  // Update contract total_value if value changed
  if (value !== undefined) {
    const delta = Number(value) - Number(stage.value);
    if (delta !== 0) {
      await service
        .from("contracts")
        .update({ total_value: Number(contract.total_value) + delta })
        .eq("id", contractId);
    }
  }

  return NextResponse.json({ stage: updatedStage });
}
