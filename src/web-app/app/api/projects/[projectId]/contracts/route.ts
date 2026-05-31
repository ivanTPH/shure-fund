/**
 * GET /api/projects/[projectId]/contracts  — list contracts + stages for a project
 * POST /api/projects/[projectId]/contracts — create a contract with stages (admin/developer)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("contracts")
    .select(`
      id, contractor_id, total_value, status, created_at,
      contractor:users!contractor_id ( id, full_name, email ),
      contract_stages ( id, name, description, value, status, start_date, end_date, created_at )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data ?? [] });
}

type StageInput = { name: string; description?: string; value: number; startDate?: string; endDate?: string };

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can create contracts." }, { status: 403 });
  }

  const { projectId } = await context.params;

  let body: { contractorEmail: string; stages: StageInput[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { contractorEmail, stages = [] } = body;
  if (!contractorEmail?.trim()) {
    return NextResponse.json({ error: "Contractor email is required." }, { status: 400 });
  }
  if (!stages.length) {
    return NextResponse.json({ error: "At least one stage is required." }, { status: 400 });
  }
  if (stages.some((s) => !s.name?.trim() || !s.value || Number(s.value) <= 0)) {
    return NextResponse.json({ error: "Every stage requires a name and a positive value." }, { status: 400 });
  }

  const service = createServiceClient();

  // Look up contractor by email
  const { data: contractor } = await service
    .from("users")
    .select("id")
    .eq("email", contractorEmail.trim().toLowerCase())
    .maybeSingle();

  if (!contractor) {
    return NextResponse.json(
      { error: `No user found with email "${contractorEmail}". They must be registered before being added as a contractor.` },
      { status: 404 },
    );
  }

  const totalValue = stages.reduce((sum, s) => sum + Number(s.value), 0);

  // Create the contract
  const { data: contract, error: cErr } = await service
    .from("contracts")
    .insert({
      project_id:    projectId,
      contractor_id: contractor.id,
      total_value:   totalValue,
      status:        "active",
    })
    .select("id")
    .single();

  if (cErr || !contract) {
    return NextResponse.json({ error: cErr?.message ?? "Failed to create contract." }, { status: 500 });
  }

  // Create stages
  const stageRows = stages.map((s, i) => ({
    contract_id: contract.id,
    name:        s.name.trim(),
    description: s.description?.trim() ?? null,
    value:       Number(s.value),
    status:      "draft" as const,
    start_date:  s.startDate ?? null,
    end_date:    s.endDate ?? null,
  }));

  const { error: sErr } = await service.from("contract_stages").insert(stageRows);
  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  // Ensure contractor is in project_members
  await service
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: contractor.id, role: "contractor", is_primary: true },
      { onConflict: "project_id,user_id" },
    );

  return NextResponse.json({ contractId: contract.id }, { status: 201 });
}
