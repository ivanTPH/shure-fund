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

  // Select base columns + project name only (avoid slow multi-table joins on 1000 rows)
  const select = `id, project_id, stage_id, actor_id, action, from_state, to_state, metadata, created_at,
    project:projects!project_id ( name )`;

  let rawEvents: Array<Record<string, unknown>> = [];

  if (effectiveRole === "admin") {
    const { data } = await service
      .from("audit_events")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(200);
    rawEvents = (data ?? []) as Array<Record<string, unknown>>;
  } else {
    const { data: memberRows } = await service
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);

    const projectIds = (memberRows ?? []).map((r) => r.project_id as string);
    if (projectIds.length === 0) {
      return (
        <AppShell>
          <GlobalAuditClient initialEvents={[]} />
        </AppShell>
      );
    }

    const { data } = await service
      .from("audit_events")
      .select(select)
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(200);
    rawEvents = (data ?? []) as Array<Record<string, unknown>>;
  }

  // Batch-fetch actor names for unique actor IDs (single query instead of per-row join)
  const actorIds = [...new Set(rawEvents.map(r => r.actor_id as string).filter(Boolean))];
  const actorMap = new Map<string, { full_name: string; role: string }>();
  if (actorIds.length) {
    const { data: actors } = await service
      .from("users")
      .select("id, full_name, role")
      .in("id", actorIds);
    for (const a of actors ?? []) {
      actorMap.set(a.id, { full_name: a.full_name ?? "", role: a.role ?? "" });
    }
  }

  const events: GlobalAuditEvent[] = rawEvents.map((row) => {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      projectName: (project as { name: string } | null)?.name ?? "Unknown project",
      stageId: (row.stage_id as string | null) ?? null,
      stageName: null,
      action: row.action as string,
      fromState: (row.from_state as string | null) ?? null,
      toState: (row.to_state as string | null) ?? null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.created_at as string,
      actor: row.actor_id ? (actorMap.get(row.actor_id as string) ?? null) : null,
    };
  });

  return (
    <AppShell>
      <GlobalAuditClient initialEvents={events} />
    </AppShell>
  );
}
