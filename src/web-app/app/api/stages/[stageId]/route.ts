/**
 * GET /api/stages/[stageId]  — fetch a single stage with contract/project info
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ stageId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  const { data, error } = await service
    .from("contract_stages")
    .select(`id, name, description, value, status, sequence_order, start_date, end_date, created_at,
             contracts!inner ( id, title, project_id, contractor_id, projects!inner ( id, name ) )`)
    .eq("id", stageId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  return NextResponse.json({ stage: data });
}
