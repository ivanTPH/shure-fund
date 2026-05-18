import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import AppShell from "@/app/components/AppShell";
import GlobalAuditClient from "./GlobalAuditClient";
import type { GlobalAuditEvent } from "./GlobalAuditClient";

// Only these roles can view the global audit log
const ALLOWED_ROLES = ["admin", "funder", "developer"];

export default async function AuditLogPage() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) redirect("/auth/login?redirectTo=/audit-log");

  const role = getRole(user);

  // If role missing from JWT (immediately after signup), check DB
  const service = createServiceClient();
  let effectiveRole = role;
  if (!effectiveRole) {
    const { data: dbUser } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    effectiveRole = (dbUser?.role as typeof role) ?? null;
  }

  if (!effectiveRole || !ALLOWED_ROLES.includes(effectiveRole)) {
    // Other roles redirect to their project list — they can see per-project audit via the project detail
    redirect("/projects");
  }

  // Fetch audit events
  // Admin sees all; others see only projects they're members of
  let query = service
    .from("audit_events")
    .select(`
      id, project_id, stage_id, action, from_state, to_state, metadata, created_at,
      project:projects!project_id ( name ),
      stage:contract_stages!stage_id ( name ),
      actor:users!actor_id ( full_name, role )
    `)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (effectiveRole !== "admin") {
    // Get project IDs this user is a member of
    const { data: memberRows } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);

    const projectIds = (memberRows ?? []).map((r) => r.project_id as string);
    if (projectIds.length === 0) {
      // No projects — show empty page
      return (
        <AppShell>
          <GlobalAuditClient initialEvents={[]} />
        </AppShell>
      );
    }
    query = query.in("project_id", projectIds);
  }

  const { data } = await query;

  const events: GlobalAuditEvent[] = (data ?? []).map((row) => {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    const stage = Array.isArray(row.stage) ? row.stage[0] : row.stage;
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: (project as { name: string } | null)?.name ?? "Unknown project",
      stageId: row.stage_id,
      stageName: (stage as { name: string } | null)?.name ?? null,
      action: row.action,
      fromState: row.from_state,
      toState: row.to_state,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      actor: actor as { full_name: string; role: string } | null,
    };
  });

  return (
    <AppShell>
      <GlobalAuditClient initialEvents={events} />
    </AppShell>
  );
}
