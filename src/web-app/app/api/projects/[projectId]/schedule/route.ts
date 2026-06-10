/**
 * GET /api/projects/[projectId]/schedule
 *
 * Payment schedule — all stages with dates, sorted by due date.
 * Returns funding windows (30/60/90-day projected draws).
 *
 * Stage is included if it has at least one of start_date or end_date.
 * Stages without dates are returned in an "undated" list.
 *
 * Each stage includes:
 *   daysUntilDue  — from today to end_date (negative = overdue)
 *   isOverdue     — end_date in past + status != released
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertProjectAccess } from "@/lib/auth-server";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ projectId: string }> };

function daysDiff(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
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
      contractor:users!contractor_id ( id, full_name ),
      contract_stages (
        id, name, value, status, start_date, end_date
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const d30 = new Date(now); d30.setDate(now.getDate() + 30);
  const d60 = new Date(now); d60.setDate(now.getDate() + 60);
  const d90 = new Date(now); d90.setDate(now.getDate() + 90);

  const staged: unknown[] = [];
  const undated: unknown[] = [];

  let win30Value = 0, win30Count = 0;
  let win60Value = 0, win60Count = 0;
  let win90Value = 0, win90Count = 0;

  for (const c of contracts ?? []) {
    const contractor = Array.isArray(c.contractor) ? c.contractor[0] : c.contractor;
    const contractorName = contractor?.full_name ?? "Unknown contractor";

    for (const s of (c.contract_stages ?? [])) {
      const value = Number(s.value);
      const isReleased = s.status === "released";

      const base = {
        id:             s.id,
        contractId:     c.id,
        name:           s.name,
        value,
        status:         s.status,
        contractorName,
        startDate:      s.start_date ?? null,
        endDate:        s.end_date ?? null,
      };

      if (!s.start_date && !s.end_date) {
        undated.push(base);
        continue;
      }

      const endDate = s.end_date ? new Date(s.end_date) : null;
      const daysUntilDue = endDate ? daysDiff(now, endDate) : null;
      const isOverdue = endDate ? !isReleased && endDate < now : false;

      staged.push({ ...base, daysUntilDue, isOverdue });

      // Fund window: count non-released stages due within window
      if (!isReleased && endDate) {
        if (endDate <= d30) { win30Value += value; win30Count++; }
        else if (endDate <= d60) { win60Value += value; win60Count++; }
        else if (endDate <= d90) { win90Value += value; win90Count++; }
      }
    }
  }

  // Sort: overdue first, then by end_date ascending, then undated
  (staged as Array<{ daysUntilDue: number | null; isOverdue: boolean; name: string }>)
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.daysUntilDue !== null && b.daysUntilDue !== null) return a.daysUntilDue - b.daysUntilDue;
      return 0;
    });

  return NextResponse.json({
    stages:  staged,
    undated,
    windows: {
      next30:  { value: win30Value, count: win30Count },
      next60:  { value: win30Value + win60Value, count: win30Count + win60Count },
      next90:  { value: win30Value + win60Value + win90Value, count: win30Count + win60Count + win90Count },
    },
  });
}
