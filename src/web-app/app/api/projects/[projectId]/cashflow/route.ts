/**
 * GET /api/projects/[projectId]/cashflow
 *
 * Monthly cash flow forecast and actuals.
 *
 * projected = non-released stages with end_date, grouped by YYYY-MM
 * actual    = released stages with end_date, grouped by YYYY-MM
 *
 * Both windows are grouped by the stage's end_date (projected payment date).
 * Stages without end_date are excluded (undated — no month to bucket into).
 *
 * Role: contractor blocked (403); all other authenticated project members allowed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertProjectAccess } from "@/lib/auth-server";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string }> };

function toYYYYMM(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (getRole(user) === "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data: contracts, error } = await service
    .from("contracts")
    .select(`
      id,
      contract_stages ( id, name, value, status, end_date )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const projectedByMonth = new Map<string, { value: number; count: number }>();
  const actualByMonth    = new Map<string, { value: number; count: number }>();

  for (const c of contracts ?? []) {
    for (const s of (c.contract_stages ?? [])) {
      if (!s.end_date) continue;
      const month = toYYYYMM(s.end_date);
      const value = Number(s.value);

      if (s.status === "released") {
        const cur = actualByMonth.get(month) ?? { value: 0, count: 0 };
        actualByMonth.set(month, { value: cur.value + value, count: cur.count + 1 });
      } else {
        const cur = projectedByMonth.get(month) ?? { value: 0, count: 0 };
        projectedByMonth.set(month, { value: cur.value + value, count: cur.count + 1 });
      }
    }
  }

  // Union of all months, sorted chronologically
  const allMonths = Array.from(
    new Set([...projectedByMonth.keys(), ...actualByMonth.keys()]),
  ).sort();

  let cumulativeProjected = 0;
  let cumulativeActual    = 0;

  const months = allMonths.map((month) => {
    const proj = projectedByMonth.get(month) ?? { value: 0, count: 0 };
    const act  = actualByMonth.get(month)    ?? { value: 0, count: 0 };
    cumulativeProjected += proj.value;
    cumulativeActual    += act.value;
    return {
      month,
      projectedValue:      proj.value,
      projectedCount:      proj.count,
      actualPaid:          act.value,
      actualCount:         act.count,
      cumulativeProjected,
      cumulativeActual,
    };
  });

  const totalProjected = months.reduce((s, m) => s + m.projectedValue, 0);
  const totalActual    = months.reduce((s, m) => s + m.actualPaid,     0);

  return NextResponse.json({
    months,
    totals: {
      totalProjected,
      totalActual,
      outstanding: totalProjected, // remaining unpaid projected draws
    },
  });
}
