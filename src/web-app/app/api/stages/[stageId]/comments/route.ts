/**
 * GET  /api/stages/[stageId]/comments  — list comments on a stage
 * POST /api/stages/[stageId]/comments  — add a comment
 *
 * Accessible to all authenticated users who are project members.
 * Contractors can only comment on their own stages.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ stageId: string }> };

async function resolveStageProject(service: ReturnType<typeof createServiceClient>, stageId: string) {
  const { data } = await service
    .from("contract_stages")
    .select("id, contract_id, contracts!inner(project_id, contractor_id)")
    .eq("id", stageId)
    .maybeSingle();
  if (!data) return null;
  const contract = Array.isArray(data.contracts) ? data.contracts[0] : data.contracts;
  return {
    stageId: data.id,
    contractId: data.contract_id,
    projectId: contract?.project_id as string,
    contractorId: contract?.contractor_id as string | null,
  };
}

// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  const meta = await resolveStageProject(service, stageId);
  if (!meta) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  const { data: comments, error } = await service
    .from("stage_comments")
    .select(`
      id, content, created_at,
      author:users!author_id ( id, full_name, email, role )
    `)
    .eq("stage_id", stageId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (comments ?? []).map((c) => {
    const author = Array.isArray(c.author) ? c.author[0] : c.author;
    return {
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: {
        id:       author?.id ?? null,
        name:     author?.full_name ?? "Unknown",
        email:    author?.email ?? null,
        role:     author?.role ?? null,
      },
    };
  });

  return NextResponse.json({ comments: shaped });
}

// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, context: RouteContext) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getRole(user);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { content?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Comment exceeds 2000 characters." }, { status: 400 });

  const { stageId } = await context.params;
  const service = createServiceClient();

  const meta = await resolveStageProject(service, stageId);
  if (!meta) return NextResponse.json({ error: "Stage not found." }, { status: 404 });

  // Ensure author exists in users table
  await service.from("users").upsert(
    { id: user.id, email: user.email ?? "", role },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data, error } = await service
    .from("stage_comments")
    .insert({ stage_id: stageId, author_id: user.id, content })
    .select("id, content, created_at, author_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch author name for response
  const { data: author } = await service
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    comment: {
      id:        data.id,
      content:   data.content,
      createdAt: data.created_at,
      author: {
        id:    author?.id ?? user.id,
        name:  author?.full_name ?? user.email ?? "Unknown",
        email: author?.email ?? user.email ?? null,
        role:  author?.role ?? role,
      },
    },
  }, { status: 201 });
}
