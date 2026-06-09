/**
 * GET /api/projects/[projectId]/wallet/transactions  — list wallet transactions
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const { data: wallet } = await service
    .from("wallets")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (!wallet) return NextResponse.json({ transactions: [] });

  const { data, error } = await service
    .from("wallet_transactions")
    .select("id, type, amount, reference, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const transactions = data ?? [];

  // CSV export
  if (req.nextUrl.searchParams.get("format") === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const OUT = new Set(["release", "allocation_out"]);
    const rows = [
      ["Date", "Type", "Reference", "Money In (£)", "Money Out (£)"],
      ...transactions.map((tx) => {
        const isOut = OUT.has(tx.type);
        const amt = Math.abs(Number(tx.amount)).toFixed(2);
        return [
          esc(tx.created_at),
          esc(tx.type),
          esc(tx.reference),
          isOut ? "" : amt,
          isOut ? amt : "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\r\n");
    const { projectId } = await context.params;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transactions-${projectId}.csv"`,
      },
    });
  }

  return NextResponse.json({ transactions });
}
