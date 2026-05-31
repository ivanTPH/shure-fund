import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import AuditClient from "./AuditClient";

const ALLOWED_ROLES = ["funder", "developer", "admin"];

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  // Auth + role guard
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) redirect(`/auth/login?redirectTo=/projects/${projectId}/audit`);

  const role = getRole(user);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    redirect("/");
  }

  // Fetch audit events server-side (no API round-trip needed)
  const service = createServiceClient();
  const { data } = await service
    .from("audit_events")
    .select(`
      id, project_id, stage_id, action, from_state, to_state, metadata, created_at,
      stage:contract_stages!stage_id ( name ),
      actor:users!actor_id ( full_name, role )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(500);

  const events = (data ?? []).map((row) => ({
    id: row.id,
    stageId: row.stage_id,
    stageName: (Array.isArray(row.stage) ? row.stage[0] : row.stage)?.name ?? null,
    action: row.action,
    fromState: row.from_state,
    toState: row.to_state,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
  }));

  return <AuditClient projectId={projectId} initialEvents={events} />;
}
