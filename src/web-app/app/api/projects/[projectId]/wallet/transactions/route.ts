/**
 * GET /api/projects/[projectId]/wallet/transactions  — list wallet transactions
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  // Get wallet id first
  const { data: wallet } = await service
    .from("wallets")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (!wallet) return NextResponse.json({ transactions: [] });

  const { data, error } = await service
    .from("wallet_transactions")
    .select("id, type, amount, description, balance_after, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data ?? [] });
}
