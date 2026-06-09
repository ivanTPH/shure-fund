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
import { runDepositAmlChecks } from "@/lib/compliance/amlRules";
import { walletDepositLimit } from "@/lib/rateLimit";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Wallet balance is financial information — restrict to funder, developer, and admin.
  // Contractors, commercial, and consultants have project access but don't need to
  // see the raw wallet balance.
  const role = getRole(user);
  if (role !== "funder" && role !== "developer" && role !== "admin") {
    return NextResponse.json({ error: "Wallet access is restricted to funder and developer roles." }, { status: 403 });
  }

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

  const rl = walletDepositLimit(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many deposit attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { amount: number; reference: string; idempotencyKey?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, reference, idempotencyKey } = body;
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

  // Idempotency check — if the client supplied a key and we've already processed it,
  // return the current wallet state without creating a duplicate transaction.
  if (idempotencyKey?.trim()) {
    const { data: existing } = await service
      .from("wallet_transactions")
      .select("wallet_id")
      .eq("idempotency_key", idempotencyKey.trim())
      .maybeSingle();

    if (existing) {
      const { data: currentWallet } = await service
        .from("wallets")
        .select("id, balance, available_amount, ringfenced_amount, updated_at")
        .eq("id", existing.wallet_id)
        .single();
      return NextResponse.json({ wallet: currentWallet, deduplicated: true }, { status: 200 });
    }
  }

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

  // Generate a provisional transaction ID for AML audit trail
  const provisionalTxId = crypto.randomUUID();

  // Run AML checks before committing the deposit
  const blockingRules = await runDepositAmlChecks({
    userId:             user.id,
    amount:             deposit,
    walletTransactionId: provisionalTxId,
    projectId,
  });

  if (blockingRules.length > 0) {
    return NextResponse.json(
      {
        error: "Deposit is under compliance review. A compliance officer will contact you within 1 business day.",
        blocked_by: blockingRules,
      },
      { status: 403 }
    );
  }

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

  // Record transaction (use provisional ID so compliance_reviews entity_id matches)
  await service.from("wallet_transactions").insert({
    id:               provisionalTxId,
    wallet_id:        wallet.id,
    type:             "deposit",
    amount:           deposit,
    reference:        reference.trim(),
    created_by:       user.id,
    ...(idempotencyKey?.trim() ? { idempotency_key: idempotencyKey.trim() } : {}),
  });

  // Audit trail — wallet_funded event so deposits appear in the global audit log
  await service.from("audit_events").insert({
    project_id: projectId,
    actor_id:   user.id,
    action:     "wallet_funded",
    metadata:   { amount: deposit, reference: reference.trim(), wallet_transaction_id: provisionalTxId },
  });

  // Return updated wallet
  const { data: updated } = await service
    .from("wallets")
    .select("id, balance, available_amount, ringfenced_amount, updated_at")
    .eq("id", wallet.id)
    .single();

  return NextResponse.json({ wallet: updated }, { status: 201 });
}
