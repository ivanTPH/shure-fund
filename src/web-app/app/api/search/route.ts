/**
 * GET /api/search?q=<term>&limit=<n>
 *
 * Cross-entity full-text search across projects, contracts, and stages.
 * Returns unified result set with type, id, title, subtitle, href.
 *
 * Auth: any authenticated user (results filtered to their accessible projects).
 * Non-authenticated → 401.
 * Missing / empty q → 400 (must be ≥ 2 chars).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export type SearchResult = {
  type: "project" | "contract" | "stage";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "No role." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const searchTerm = (searchParams.get("q") ?? "").trim();
  if (!searchTerm || searchTerm.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
  }
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const lc = searchTerm.toLowerCase();

  const service = createServiceClient();

  // Determine which project IDs the user can see (null = all, i.e. admin)
  let allowedProjectIds: string[] | null = null;
  if (role !== "admin") {
    const { data: memberships } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    allowedProjectIds = (memberships ?? []).map((m: { project_id: string }) => m.project_id);
  }

  if (allowedProjectIds !== null && allowedProjectIds.length === 0) {
    return NextResponse.json({ results: [], q: searchTerm, total: 0 });
  }

  // ── Fetch candidates in parallel ──────────────────────────────────────────
  // Fetch with generous limits and filter JS-side — avoids PostgREST ilike
  // wildcard encoding issues and keeps logic predictable.
  const projectBase = allowedProjectIds !== null
    ? service.from("projects").select("id, name, address, status").in("id", allowedProjectIds)
    : service.from("projects").select("id, name, address, status");

  const [
    { data: allProjects },
    { data: allContracts },
    { data: allStages },
  ] = await Promise.all([
    projectBase.limit(200),
    service
      .from("contracts")
      .select("id, status, project_id, projects!contracts_project_id_fkey ( id, name )")
      .limit(400),
    service
      .from("contract_stages")
      .select("id, name, status, value, contract_id, contracts!contract_stages_contract_id_fkey ( project_id, projects!contracts_project_id_fkey ( id, name ) )")
      .limit(400),
  ]);

  const results: SearchResult[] = [];

  // ── Projects ──────────────────────────────────────────────────────────────
  for (const p of allProjects ?? []) {
    const nameMatch    = (p.name ?? "").toLowerCase().includes(lc);
    const addressMatch = (p.address ?? "").toLowerCase().includes(lc);
    if (!nameMatch && !addressMatch) continue;
    results.push({
      type: "project",
      id: p.id,
      title: p.name,
      subtitle: p.address ?? p.status,
      href: `/projects/${p.id}`,
    });
    if (results.filter((r) => r.type === "project").length >= limit) break;
  }

  // ── Contracts ─────────────────────────────────────────────────────────────
  for (const c of allContracts ?? []) {
    const proj = Array.isArray(c.projects) ? c.projects[0] : c.projects;
    if (!proj) continue;
    const projName: string = (proj as { name: string }).name ?? "";
    const projId: string   = (proj as { id: string }).id ?? c.project_id;
    if (allowedProjectIds !== null && !allowedProjectIds.includes(projId)) continue;
    const nameMatch   = projName.toLowerCase().includes(lc);
    const statusMatch = c.status.toLowerCase().includes(lc);
    if (!nameMatch && !statusMatch) continue;
    results.push({
      type: "contract",
      id: c.id,
      title: `Contract — ${projName}`,
      subtitle: `Status: ${c.status}`,
      href: `/projects/${projId}/contracts/${c.id}`,
    });
    if (results.filter((r) => r.type === "contract").length >= limit) break;
  }

  // ── Stages ────────────────────────────────────────────────────────────────
  for (const s of allStages ?? []) {
    const contract = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts;
    if (!contract) continue;
    const proj = Array.isArray((contract as { projects: unknown }).projects)
      ? ((contract as { projects: unknown[] }).projects)[0]
      : (contract as { projects: unknown }).projects;
    if (!proj) continue;
    const projId: string   = (proj as { id: string }).id;
    const projName: string = (proj as { name: string }).name ?? "";
    if (allowedProjectIds !== null && !allowedProjectIds.includes(projId)) continue;
    const nameMatch    = s.name.toLowerCase().includes(lc);
    const projMatch    = projName.toLowerCase().includes(lc);
    if (!nameMatch && !projMatch) continue;
    results.push({
      type: "stage",
      id: s.id,
      title: s.name,
      subtitle: `${projName} · ${s.status} · £${Number(s.value).toLocaleString("en-GB")}`,
      href: `/projects/${projId}/stages/${s.id}`,
    });
    if (results.filter((r) => r.type === "stage").length >= limit) break;
  }

  // Deduplicate by id+type and cap total
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);

  return NextResponse.json({ results: deduped, q: searchTerm, total: deduped.length });
}
