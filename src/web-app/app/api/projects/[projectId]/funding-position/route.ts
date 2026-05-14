/**
 * GET /api/projects/[projectId]/funding-position
 *
 * Returns the live funding assurance position for a project.
 * Authenticated: any project participant.
 *
 * Response:
 *   200 FundingPosition
 *   401 Unauthorized
 *   404 Project or wallet not found
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calculateFundingPosition,
  type StageSnapshot,
} from "@/lib/funding/assuranceEngine";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  // Auth
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const service = createServiceClient();

  // Fetch wallet
  const { data: wallet, error: walletError } = await service
    .from("wallets")
    .select("available_amount, balance, ringfenced_amount")
    .eq("project_id", projectId)
    .single();

  if (walletError || !wallet) {
    return NextResponse.json({ error: "Wallet not found for this project." }, { status: 404 });
  }

  // Fetch all non-terminal stages for the project
  const { data: stages, error: stagesError } = await service
    .from("contract_stages")
    .select(`
      id, name, status, value,
      contracts!inner ( project_id )
    `)
    .eq("contracts.project_id", projectId)
    .not("status", "in", '("released","draft","sent")');

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 });
  }

  const snapshots: StageSnapshot[] = (stages ?? []).map((s) => ({
    stageId: s.id,
    stageName: s.name,
    value: Number(s.value),
    status: s.status,
  }));

  const position = calculateFundingPosition(Number(wallet.available_amount), snapshots);

  return NextResponse.json({
    projectId,
    wallet: {
      balance: Number(wallet.balance),
      ringfenced: Number(wallet.ringfenced_amount),
      available: Number(wallet.available_amount),
    },
    ...position,
  });
}
