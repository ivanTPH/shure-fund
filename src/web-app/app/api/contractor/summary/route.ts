/**
 * GET /api/contractor/summary
 *
 * Cross-project summary for the authenticated contractor.
 * Contractor role only — 403 for any other role.
 *
 * Returns all contracts (and their stages) where contractor_id = current user,
 * grouped by project, plus portfolio totals.
 *
 * Totals:
 *   totalValue        — sum of all stage values
 *   paidValue         — sum of released stage values
 *   pendingValue      — sum of non-released stage values
 *   actionRequired    — count of stages needing contractor action (in_progress | returned)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "contractor") {
    return NextResponse.json({ error: "Contractor access only." }, { status: 403 });
  }

  const service = createServiceClient();

  const { data: contracts, error } = await service
    .from("contracts")
    .select(`
      id, status, total_value, created_at,
      project:projects!project_id ( id, name, address, status ),
      contract_stages (
        id, name, value, status, start_date, end_date
      )
    `)
    .eq("contractor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by project
  const projectMap = new Map<string, {
    project: { id: string; name: string; address: string; status: string };
    contracts: typeof contracts;
  }>();

  for (const c of contracts ?? []) {
    const proj = Array.isArray(c.project) ? c.project[0] : c.project;
    if (!proj) continue;
    if (!projectMap.has(proj.id)) {
      projectMap.set(proj.id, { project: proj, contracts: [] });
    }
    projectMap.get(proj.id)!.contracts.push(c);
  }

  // Compute totals
  let totalValue     = 0;
  let paidValue      = 0;
  let actionRequired = 0;

  const ACTION_STATUSES = new Set(["in_progress", "returned"]);

  for (const c of contracts ?? []) {
    for (const s of (c.contract_stages ?? [])) {
      const v = Number(s.value);
      totalValue += v;
      if (s.status === "released") paidValue += v;
      if (ACTION_STATUSES.has(s.status)) actionRequired++;
    }
  }

  const pendingValue = totalValue - paidValue;

  const projects = Array.from(projectMap.values()).map(({ project, contracts: pContracts }) => ({
    id:       project.id,
    name:     project.name,
    address:  project.address,
    status:   project.status,
    contracts: pContracts.map((c) => ({
      id:     c.id,
      status: c.status,
      stages: (c.contract_stages ?? []).map((s) => ({
        id:         s.id,
        name:       s.name,
        value:      Number(s.value),
        status:     s.status,
        startDate:  s.start_date ?? null,
        endDate:    s.end_date   ?? null,
      })),
    })),
  }));

  return NextResponse.json({
    projects,
    totals: { totalValue, paidValue, pendingValue, actionRequired },
  });
}
