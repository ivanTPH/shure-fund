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
  sent:                 "#2563eb",
  accepted:             "#7c3aed",
  in_progress:          "#d97706",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
  funding_gap:          "#dc2626",
  part_funded:          "#d97706",
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
        start_date, end_date, created_at, retention_released_at
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
      <div className="min-h-full px-4 md:px-8 py-8 max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "rgba(13,17,68,0.45)" }}>
          <Link href={`/projects/${projectId}`} className="transition hover:opacity-70">
            {project?.name ?? "Project"}
          </Link>
          <span>/</span>
          <span>Contract</span>
        </div>

        {/* Contract header card */}
        <div
          className="rounded-[24px] p-5 mb-6"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.4)" }}>
                Contractor
              </p>
              <p className="text-lg font-bold leading-tight" style={{ color: "var(--brand-navy, #0D1144)" }}>
                {contractor?.full_name ?? "Unknown contractor"}
              </p>
              {contractor?.email && (
                <p className="mt-0.5 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>{contractor.email}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.4)" }}>
                Contract value
              </p>
              <p className="text-xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(contract.total_value)}</p>
              <span
                className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: (contract.status === "active" ? "#059669" : "#94a3b8") + "18",
                  color: contract.status === "active" ? "#059669" : "#94a3b8",
                }}
              >
                {contract.status}
              </span>
            </div>
          </div>
          {createdDate && (
            <p className="mt-3 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Created {createdDate}</p>
          )}
        </div>

        {/* Financial summary row */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
          {[
            { label: "Released",     value: released,       color: "#16a34a" },
            { label: "Ready to pay", value: readyToRelease, color: "#059669" },
            { label: "Active",       value: active,         color: "#d97706" },
            { label: "Not started",  value: uncommitted,    color: "#94a3b8" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl px-4 py-3"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <p className="text-[10px] mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
              <p className="text-base font-bold" style={{ color }}>
                {gbp.format(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Stage list header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
            Payment stages · {stages.length}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/contracts/${contractId}/approval-chain`}
              className="text-xs font-semibold transition hover:opacity-70"
              style={{ color: "#7c3aed" }}
            >
              Approval chain →
            </Link>
            {canManage && (
              <Link
                href={`/projects/${projectId}/contracts/${contractId}/add-stage`}
                className="text-xs font-semibold transition hover:opacity-70"
                style={{ color: "#2563eb" }}
              >
                + Add stage
              </Link>
            )}
          </div>
        </div>

        {stages.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
              No stages have been added to this contract yet.
            </p>
            {canManage && (
              <Link
                href={`/projects/${projectId}/contracts/${contractId}/add-stage`}
                className="mt-3 inline-block text-xs font-semibold transition hover:opacity-70"
                style={{ color: "#2563eb" }}
              >
                + Add first stage →
              </Link>
            )}
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

              const canEdit = canManage && ["draft", "sent"].includes(stage.status);

              return (
                <div key={stage.id} className="relative">
                {canEdit && (
                  <Link
                    href={`/projects/${projectId}/contracts/${contractId}/stages/${stage.id}/edit`}
                    className="absolute top-3 right-3 z-10 text-[10px] font-semibold px-2 py-1 rounded-lg transition hover:opacity-70"
                    style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "rgba(13,17,68,0.55)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                )}
                <Link
                  href={`/projects/${projectId}/stages/${stage.id}`}
                  className="block rounded-[20px] p-4 transition hover:bg-neutral-50"
                  style={{
                    border: `1px solid ${color}33`,
                    backgroundColor: "#fff",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Status pills */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-[10px] font-bold" style={{ color: "rgba(13,17,68,0.35)" }}>#{i + 1}</p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: color + "18", color }}
                        >
                          {stage.status.replace(/_/g, " ")}
                        </span>
                        {isOverdue && (
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                          >
                            overdue
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold leading-snug" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {stage.name}
                      </p>

                      {stage.description && (
                        <p className="mt-0.5 text-xs leading-relaxed line-clamp-2" style={{ color: "rgba(13,17,68,0.5)" }}>
                          {stage.description}
                        </p>
                      )}

                      {(startStr || endStr) && (
                        <p className="mt-2 text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>
                          {startStr && endStr
                            ? `${startStr} – ${endStr}`
                            : startStr
                            ? `From ${startStr}`
                            : `Due ${endStr}`}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(stage.value)}</p>
                      <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.35)" }}>→</p>
                    </div>
                  </div>
                </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Back */}
        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
          <Link
            href={`/projects/${projectId}`}
            className="text-xs font-medium transition hover:opacity-70"
            style={{ color: "rgba(13,17,68,0.5)" }}
          >
            ← Back to project
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
