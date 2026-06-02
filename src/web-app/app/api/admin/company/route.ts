/**
 * GET  /api/admin/company — fetch the current admin's company record
 * PATCH /api/admin/company — update name, email, phone, registered_address
 *
 * Restricted to users with role = 'admin'.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  // Resolve company via users.company_id
  const { data: profile } = await service
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: "No company linked to this account." }, { status: 404 });
  }

  const { data: company, error } = await service
    .from("companies")
    .select("id, name, email, phone, registered_address, type, verified")
    .eq("id", profile.company_id)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  return NextResponse.json({ company });
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

type PatchBody = {
  name?: string;
  email?: string;
  phone?: string;
  registeredAddress?: string;
};

export async function PATCH(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: "No company linked to this account." }, { status: 404 });
  }

  const updates: Record<string, string | undefined> = {};
  if (body.name !== undefined)              updates.name               = body.name.trim() || undefined;
  if (body.email !== undefined)             updates.email              = body.email.trim() || undefined;
  if (body.phone !== undefined)             updates.phone              = body.phone.trim() || undefined;
  if (body.registeredAddress !== undefined) updates.registered_address = body.registeredAddress.trim() || undefined;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: company, error } = await service
    .from("companies")
    .update(updates)
    .eq("id", profile.company_id)
    .select("id, name, email, phone, registered_address, type, verified")
    .single();

  if (error || !company) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ company });
}
