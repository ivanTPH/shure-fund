/**
 * DELETE /api/projects/[projectId]/token-holders/[holderId]
 *
 * Removes a token holder from the project trust.
 * Only admin and developer can delete.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ projectId: string; holderId: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (role !== "admin" && role !== "developer") {
    return NextResponse.json({ error: "Only admin and developer can remove token holders." }, { status: 403 });
  }

  const { projectId, holderId } = await context.params;
  const service = createServiceClient();

  const denied = await assertProjectAccess(service, user, projectId);
  if (denied) return denied;

  // Verify the holder belongs to this project
  const { data: existing } = await service
    .from("project_token_holders")
    .select("id")
    .eq("id", holderId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Token holder not found." }, { status: 404 });
  }

  const { error } = await service
    .from("project_token_holders")
    .delete()
    .eq("id", holderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
