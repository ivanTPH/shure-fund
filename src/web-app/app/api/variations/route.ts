/**
 * POST /api/variations
 * Create a new variation in draft status.
 * Roles: contractor, developer, admin
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { notifyVariationSubmitted } from "@/lib/notifications/notificationService";

export async function POST(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role || !["contractor", "developer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Only contractors, developers, or admins may create variations." }, { status: 403 });
  }

  let body: { stageId: string; description: string; valueChange: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageId, description, valueChange } = body;
  if (!stageId || !description || valueChange === undefined) {
    return NextResponse.json({ error: "Missing stageId, description, or valueChange" }, { status: 400 });
  }

  const service = createServiceClient();

  // Ensure user profile exists
  const meta = user.user_metadata ?? {};
  await service.from("users").upsert(
    { id: user.id, email: user.email ?? "", full_name: meta.full_name ?? user.email?.split("@")[0] ?? "Unknown", role: meta.role ?? "contractor" },
    { onConflict: "id", ignoreDuplicates: false },
  );

  const { data, error } = await service
    .from("variations")
    .insert({
      stage_id: stageId,
      description,
      value_change: valueChange,
      requested_by: user.id,
      status: "draft",
    })
    .select("id, stage_id, description, value_change, status, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  // Auto-submit if submitted directly (status = submitted)
  // For now creates as draft — client can call /submit next
  return NextResponse.json({ variation: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stageId = request.nextUrl.searchParams.get("stageId");
  if (!stageId) return NextResponse.json({ error: "Missing stageId" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("variations")
    .select(`id, stage_id, description, value_change, status, approved_at, created_at,
             requester:users!requested_by ( full_name, role ),
             approver:users!approved_by ( full_name, role )`)
    .eq("stage_id", stageId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variations: data ?? [] });
}
