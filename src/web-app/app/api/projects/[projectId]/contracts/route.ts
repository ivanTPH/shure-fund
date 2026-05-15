/**
 * GET /api/projects/[projectId]/contracts  — list contracts + stages for a project
 * POST /api/projects/[projectId]/contracts — create a contract with stages (admin/developer)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("contracts")
    .select(`id, title, contractor_name, status, created_at,
             contract_stages ( id, name, value, status, sequence_order )`)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data ?? [] });
}

type StageInput = { name: string; value: number };

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can create contracts" }, { status: 403 });
  }

  const { projectId } = await context.params;
  let body: { title: string; contractorName?: string; stages?: StageInput[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, contractorName, stages = [] } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Contract title is required" }, { status: 400 });
  if (!stages.length) return NextResponse.json({ error: "At least one stage is required" }, { status: 400 });

  const service = createServiceClient();

  // Create contract
  const { data: contract, error: cErr } = await service
    .from("contracts")
    .insert({ project_id: projectId, title: title.trim(), contractor_name: contractorName?.trim() ?? "", status: "active" })
    .select("id")
    .single();

  if (cErr || !contract) return NextResponse.json({ error: cErr?.message ?? "Failed to create contract" }, { status: 500 });

  // Create stages
  const stageRows = stages.map((s, i) => ({
    contract_id: contract.id,
    name: s.name.trim(),
    value: Number(s.value),
    status: "pending",
    sequence_order: i + 1,
  }));

  const { error: sErr } = await service.from("contract_stages").insert(stageRows);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ contractId: contract.id }, { status: 201 });
}
