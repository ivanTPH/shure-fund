/**
 * GET  /api/projects/[projectId]/wallet  — get wallet balances for a project
 * POST /api/projects/[projectId]/wallet  — deposit funds (funder / admin only)
 *
 * POST body: { amount: number, reference: string }
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
    .from("wallets")
    .select("id, balance, available_amount, ringfenced_amount, updated_at")
    .eq("project_id", projectId)
    .single();

  if (error) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  return NextResponse.json({ wallet: data });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "funder" && role !== "admin") {
    return NextResponse.json({ error: "Only funders can add funds to the wallet." }, { status: 403 });
  }

  let body: { amount: number; reference: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, reference } = body;
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (!reference?.trim()) {
    return NextResponse.json({ error: "Reference is required." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Fetch current wallet
  const { data: wallet, error: walletErr } = await service
    .from("wallets")
    .select("id, balance, available_amount")
    .eq("project_id", projectId)
    .single();

  if (walletErr || !wallet) {
    return NextResponse.json({ error: "Wallet not found for this project." }, { status: 404 });
  }

  const deposit = Number(amount);

  // Update wallet balances
  const { error: updateErr } = await service
    .from("wallets")
    .update({
      balance:          Number(wallet.balance) + deposit,
      available_amount: Number(wallet.available_amount) + deposit,
    })
    .eq("id", wallet.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Record transaction
  await service.from("wallet_transactions").insert({
    wallet_id:  wallet.id,
    type:       "deposit",
    amount:     deposit,
    reference:  reference.trim(),
    created_by: user.id,
  });

  // Return updated wallet
  const { data: updated } = await service
    .from("wallets")
    .select("id, balance, available_amount, ringfenced_amount, updated_at")
    .eq("id", wallet.id)
    .single();

  return NextResponse.json({ wallet: updated }, { status: 201 });
}
