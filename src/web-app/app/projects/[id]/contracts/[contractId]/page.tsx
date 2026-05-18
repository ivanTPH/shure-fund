/**
 * Contract detail — /projects/[id]/contracts/[contractId]
 *
 * Hub page for a single contract. Shows:
 *   • Contract header: contractor, total value, status, created date
 *   • Financial summary: released / ready / in-progress / uncommitted
 *   • Stage list: each stage as a card with status pill, value, dates,
 *     link to the stage overview hub
 *
 * Server component — no interactivity required; data fetched directly via
 * service client so RLS doesn't interfere.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  sent:                 "#60a5fa",
  accepted:             "#818cf8",
  in_progress:          "#fbbf24",
  awaiting_approval:    "#c084fc",
  returned:             "#fb923c",
  disputed:             "#f87171",
  available_to_release: "#34d399",
  released:             "#4ade80",
  funding_gap:          "#f87171",
  part_funded:          "#fbbf24",
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Params = Promise<{ id: string; contractId: string }>;

export default async function ContractDetailPage({ params }: { params: Params }) {
  const { id: projectId, contractId } = await params;

  // Auth
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirectTo=/projects/${projectId}/contracts/${contractId}`);
  }

  const service = createServiceClient();

  // Fetch contract (must belong to this project)
  const { data: contract } = await service
    .from("contracts")
    .select(`
      id, project_id, total_value, status, created_at,
      contractor:users!contractor_id ( id, full_name, email ),
      project:projects!project_id ( id, name ),
      contract_stages (
        id, name, description, value, status,
        start_date, end_date, created_at
      )
    `)
    .eq("id", contractId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!contract) redirect(`/projects/${projectId}`);

  const role = getRole(user);
  const canManage = role === "admin" || role === "developer";

  // Sort stages by created_at ascending
  const stages = [...(contract.contract_stages ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const contractor = Array.isArray(contract.contractor)
    ? contract.contractor[0]
    : contract.contractor;

  const project = Array.isArray(contract.project)
    ? contract.project[0]
    : contract.project;

  // Financial summary buckets
  const released       = stages.filter(s => s.status === "released").reduce((sum, s) => sum + s.value, 0);
  const readyToRelease = stages.filter(s => s.status === "available_to_release").reduce((sum, s) => sum + s.value, 0);
  const active         = stages
    .filter(s => ["in_progress", "awaiting_approval", "disputed", "returned", "sent", "accepted"].includes(s.status))
    .reduce((sum, s) => sum + s.value, 0);
  const uncommitted    = stages.filter(s => s.status === "draft").reduce((sum, s) => sum + s.value, 0);

  const createdDate = fmtDate(contract.created_at);

  return (
    <AppShell>
      <div
        className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto"
        style={{ backgroundColor: "#0d1144" }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href={`/projects/${projectId}`} className="hover:text-white transition">
            {project?.name ?? "Project"}
          </Link>
          <span>/</span>
          <span className="text-neutral-400">Contract</span>
        </div>

        {/* Contract header card */}
        <div
          className="rounded-[24px] p-5 mb-6"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                Contractor
              </p>
              <p className="text-lg font-bold text-white leading-tight">
                {contractor?.full_name ?? "Unknown contractor"}
              </p>
              {contractor?.email && (
                <p className="mt-0.5 text-sm text-neutral-400">{contractor.email}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                Contract value
              </p>
              <p className="text-xl font-bold text-white">{gbp.format(contract.total_value)}</p>
              <span
                className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: (contract.status === "active" ? "#34d399" : "#94a3b8") + "22",
                  color: contract.status === "active" ? "#34d399" : "#94a3b8",
                }}
              >
                {contract.status}
              </span>
            </div>
          </div>
          {createdDate && (
            <p className="mt-3 text-xs text-neutral-600">Created {createdDate}</p>
          )}
        </div>

        {/* Financial summary row */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
          {[
            { label: "Released",     value: released,       color: "#4ade80" },
            { label: "Ready to pay", value: readyToRelease, color: "#34d399" },
            { label: "Active",       value: active,         color: "#fbbf24" },
            { label: "Not started",  value: uncommitted,    color: "#94a3b8" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl px-4 py-3"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              <p className="text-[10px] text-neutral-500 mb-1">{label}</p>
              <p className="text-base font-bold" style={{ color }}>
                {gbp.format(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Stage list header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Payment stages · {stages.length}
          </p>
          {canManage && (
            <Link
              href={`/projects/${projectId}/contracts/new`}
              className="text-xs font-medium text-blue-400 hover:text-blue-200 transition"
            >
              + New contract
            </Link>
          )}
        </div>

        {stages.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-sm text-neutral-500">
              No stages have been added to this contract yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, i) => {
              const color    = STATUS_COLOR[stage.status] ?? "#94a3b8";
              const startStr = fmtDate(stage.start_date);
              const endStr   = fmtDate(stage.end_date);
              const isOverdue =
                stage.end_date &&
                stage.status !== "released" &&
                new Date(stage.end_date) < new Date();

              return (
                <Link
                  key={stage.id}
                  href={`/projects/${projectId}/stages/${stage.id}`}
                  className="block rounded-[20px] p-4 transition hover:bg-white/5"
                  style={{
                    border: `1px solid ${color}33`,
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Status pills */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-[10px] font-bold text-neutral-600">#{i + 1}</p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          {stage.status.replace(/_/g, " ")}
                        </span>
                        {isOverdue && (
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: "#f8717122", color: "#f87171" }}
                          >
                            overdue
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-white leading-snug">
                        {stage.name}
                      </p>

                      {stage.description && (
                        <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                          {stage.description}
                        </p>
                      )}

                      {(startStr || endStr) && (
                        <p className="mt-2 text-[10px] text-neutral-600">
                          {startStr && endStr
                            ? `${startStr} – ${endStr}`
                            : startStr
                            ? `From ${startStr}`
                            : `Due ${endStr}`}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{gbp.format(stage.value)}</p>
                      <p className="mt-1 text-xs text-neutral-500">→</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Back */}
        <div
          className="mt-10 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link
            href={`/projects/${projectId}`}
            className="text-xs font-medium text-neutral-500 hover:text-white transition"
          >
            ← Back to project
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
