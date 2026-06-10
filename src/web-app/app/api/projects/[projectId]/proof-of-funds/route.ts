/**
 * GET  /api/projects/[projectId]/proof-of-funds — list all PoF declarations
 * POST /api/projects/[projectId]/proof-of-funds — declare new Tier 2 PoF
 *
 * Roles: funder, admin, developer (read); funder, admin (write)
 *
 * POST body:
 *   amount        number  (required, > 0)
 *   validFrom     string  ISO date  (required)
 *   validUntil    string  ISO date  (required, > validFrom)
 *   bankName      string  (optional)
 *   bankReference string  (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer", "funder"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("proof_of_funds")
    .select(`
      id, amount, bank_name, bank_reference, valid_from, valid_until,
      status, withdrawn_at, withdrawal_reason, created_at,
      declarer:users!declared_by ( id, full_name, email )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-expire records whose valid_until has passed
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const toExpire = (data ?? [])
    .filter((p) => p.status === "active" && p.valid_until < now)
    .map((p) => p.id);

  if (toExpire.length > 0) {
    await service
      .from("proof_of_funds")
      .update({ status: "expired" })
      .in("id", toExpire);
    // Update status in returned data too
    for (const p of data ?? []) {
      if (toExpire.includes(p.id)) p.status = "expired" as typeof p.status;
    }
  }

  const active  = (data ?? []).filter((p) => p.status === "active");
  const history = (data ?? []).filter((p) => p.status !== "active");
  const totalActive = active.reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({ declarations: data ?? [], active, history, totalActive });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "funder"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admin and funder can declare proof of funds." }, { status: 403 });
  }

  let body: {
    amount?: number;
    validFrom?: string;
    validUntil?: string;
    bankName?: string;
    bankReference?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, validFrom, validUntil, bankName, bankReference } = body;

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
  }
  if (!validFrom) {
    return NextResponse.json({ error: "validFrom is required." }, { status: 400 });
  }
  if (!validUntil) {
    return NextResponse.json({ error: "validUntil is required." }, { status: 400 });
  }
  if (new Date(validUntil) <= new Date(validFrom)) {
    return NextResponse.json({ error: "validUntil must be after validFrom." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  const { data, error } = await service
    .from("proof_of_funds")
    .insert({
      project_id:     projectId,
      declared_by:    user.id,
      amount:         Number(amount),
      bank_name:      bankName?.trim() || null,
      bank_reference: bankReference?.trim() || null,
      valid_from:     validFrom,
      valid_until:    validUntil,
      status:         "active",
    })
    .select("id, amount, bank_name, bank_reference, valid_from, valid_until, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ declaration: data }, { status: 201 });
}
