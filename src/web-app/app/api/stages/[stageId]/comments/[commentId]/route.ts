/**
 * DELETE /api/stages/[stageId]/comments/[commentId]
 *
 * Authors can delete their own comments.
 * Admin can delete any comment.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ stageId: string; commentId: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  const { stageId, commentId } = await context.params;
  const service = createServiceClient();

  const { data: comment } = await service
    .from("stage_comments")
    .select("id, stage_id, author_id")
    .eq("id", commentId)
    .eq("stage_id", stageId)
    .maybeSingle();

  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });

  if (comment.author_id !== user.id && role !== "admin") {
    return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
  }

  const { error } = await service
    .from("stage_comments")
    .delete()
    .eq("id", commentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
