/**
 * POST /api/projects/[projectId]/contracts/[contractId]/stages
 * Adds a new stage to an existing contract (admin / developer only).
 * Updates the contract total_value to reflect the new stage.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string; contractId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can add stages." }, { status: 403 });
  }

  const { projectId, contractId } = await context.params;
  const service = createServiceClient();

  // Verify contract belongs to this project
  const { data: contract } = await service
    .from("contracts")
    .select("id, total_value")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  let body: { name: string; description?: string; value: number; startDate?: string; endDate?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, description, value, startDate, endDate } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Stage name is required." }, { status: 400 });
  if (!value || Number(value) <= 0) return NextResponse.json({ error: "Stage value must be positive." }, { status: 400 });

  // Insert stage
  const { data: stage, error: stageErr } = await service
    .from("contract_stages")
    .insert({
      contract_id: contractId,
      name:        name.trim(),
      description: description?.trim() ?? null,
      value:       Number(value),
      status:      "draft",
      start_date:  startDate ?? null,
      end_date:    endDate ?? null,
    })
    .select("id")
    .single();

  if (stageErr || !stage) {
    return NextResponse.json({ error: stageErr?.message ?? "Failed to create stage." }, { status: 500 });
  }

  // Update contract total_value
  await service
    .from("contracts")
    .update({ total_value: contract.total_value + Number(value) })
    .eq("id", contractId);

  return NextResponse.json({ stageId: stage.id }, { status: 201 });
}
