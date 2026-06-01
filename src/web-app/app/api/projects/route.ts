/**
 * GET /api/projects  — list projects the current user can access
 * POST /api/projects — create a new project (admin/developer)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("projects")
    .select("id, name, address, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!["admin", "developer"].includes(role ?? "")) {
    return NextResponse.json({ error: "Only admins or developers can create projects" }, { status: 403 });
  }

  let body: { name: string; location?: string; funderId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, location, funderId } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  // Ensure the creating user has a profile row (needed for FK)
  const service = createServiceClient();
  await service.from("users").upsert({ id: user.id, email: user.email ?? "", full_name: user.user_metadata?.full_name ?? user.email ?? "", role: getRole(user) ?? "developer" }, { onConflict: "id" });

  const { data, error } = await service
    .from("projects")
    .insert({
      name:         name.trim(),
      address:      location?.trim() ?? "",
      status:       "active",
      developer_id: user.id,                   // creator is the developer
      funder_id:    funderId ?? user.id,        // caller can provide a funder; defaults to creator
    })
    .select("id, name, address, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-assign the creator as a primary team member
  await service.from("project_members").insert({
    project_id: data.id,
    user_id:    user.id,
    role:       role as string,
    is_primary: true,
  });

  return NextResponse.json({ project: data }, { status: 201 });
}
