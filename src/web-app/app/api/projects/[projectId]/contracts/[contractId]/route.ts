/**
 * GET   /api/projects/[projectId]/contracts/[contractId]  — fetch contract details
 * PATCH /api/projects/[projectId]/contracts/[contractId]  — transition contract status
 *
 * Contract status lifecycle:
 *   draft → issued       (admin/developer sends contract to contractor)
 *   issued → accepted    (contractor accepts the contract)
 *   issued → cancelled   (admin/developer cancels before acceptance)
 *   accepted → active    (admin/developer activates — work begins)
 *   active → completed   (admin/developer closes out)
 *   active → cancelled   (admin/developer cancels — rare)
 *
 * Roles:
 *   draft → issued:     admin, developer
 *   issued → accepted:  contractor (who is the contract's contractor_id), admin
 *   issued → cancelled: admin, developer
 *   accepted → active:  admin, developer
 *   active → completed: admin, developer
 *   active → cancelled: admin, developer
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type ContractStatus = "draft" | "issued" | "accepted" | "active" | "completed" | "cancelled";

// Valid transitions: [fromStatus, toStatus, allowedRoles]
const TRANSITIONS: Array<{
  from: ContractStatus;
  to: ContractStatus;
  roles: string[];
  contractorOnly?: boolean; // contractor must also be the contract's contractor_id
}> = [
  { from: "draft",     to: "issued",    roles: ["admin", "developer"] },
  { from: "issued",    to: "accepted",  roles: ["admin", "contractor"], contractorOnly: true },
  { from: "issued",    to: "cancelled", roles: ["admin", "developer"] },
  { from: "accepted",  to: "active",    roles: ["admin", "developer"] },
  { from: "active",    to: "completed", roles: ["admin", "developer"] },
  { from: "active",    to: "cancelled", roles: ["admin", "developer"] },
];

type RouteContext = { params: Promise<{ projectId: string; contractId: string }> };

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, contractId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("contracts")
    .select(`
      id, project_id, contractor_id, total_value, status, created_at,
      contractor:users!contractor_id ( id, full_name, email ),
      contract_stages ( id, name, value, status, start_date, end_date, created_at )
    `)
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  return NextResponse.json({ contract: data });
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  // Only roles that appear in at least one transition are permitted to call this
  const PERMITTED_ROLES = new Set(["admin", "developer", "contractor"]);
  if (!role || !PERMITTED_ROLES.has(role)) {
    return NextResponse.json({ error: "Your role cannot modify contract status." }, { status: 403 });
  }

  let body: { status?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status: toStatus } = body;
  if (!toStatus) return NextResponse.json({ error: "status is required." }, { status: 400 });

  const { projectId, contractId } = await context.params;
  const service = createServiceClient();

  // Fetch current contract
  const { data: contract } = await service
    .from("contracts")
    .select("id, project_id, contractor_id, status")
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  const fromStatus = contract.status as ContractStatus;
  const transition = TRANSITIONS.find(t => t.from === fromStatus && t.to === toStatus);

  if (!transition) {
    return NextResponse.json({
      error: `Transition from "${fromStatus}" to "${toStatus}" is not allowed.`,
      allowedTransitions: TRANSITIONS.filter(t => t.from === fromStatus).map(t => t.to),
    }, { status: 422 });
  }

  // Role check
  if (!transition.roles.includes(role)) {
    return NextResponse.json({ error: `Your role (${role}) cannot perform this transition.` }, { status: 403 });
  }

  // Contractor can only accept their own contract
  if (role === "contractor" && transition.contractorOnly && contract.contractor_id !== user.id) {
    return NextResponse.json({ error: "You can only accept contracts assigned to you." }, { status: 403 });
  }

  const { data: updated, error: updateErr } = await service
    .from("contracts")
    .update({ status: toStatus as ContractStatus })
    .eq("id", contractId)
    .select("id, project_id, contractor_id, total_value, status")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ contract: updated });
}
