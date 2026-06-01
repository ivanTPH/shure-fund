"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "./components/AppShell";
import type { AppRole } from "@/lib/auth";
import type { AttentionItems } from "./projects/ProjectsClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Metric = { label: string; value: string; color: string; sub?: string };

type Project = {
  id: string;
  name: string;
  address: string;
  status: string;
  totalStages: number;
  completedStages: number;
  totalValue: number;
  totalDrawn: number;
  walletAvailable: number;
};

type RecentNotification = {
  id: string;
  type: string;
  message: string;
  entity_name: string | null;
  action_url: string | null;
  created_at: string;
  required_action: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function compactGbp(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}k`;
  return gbp.format(n);
}

const relFmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
function timeAgo(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  const mins = Math.round(diff / 60_000);
  const hrs  = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(mins) < 60) return relFmt.format(mins, "minute");
  if (Math.abs(hrs)  < 24) return relFmt.format(hrs,  "hour");
  return relFmt.format(days, "day");
}

const ROLE_LABELS: Record<string, string> = {
  funder:     "Funder",
  developer:  "Developer",
  commercial: "Commercial manager",
  contractor: "Contractor",
  consultant: "Consultant",
  admin:      "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  funder:     "#34d399",
  developer:  "#60a5fa",
  commercial: "#fbbf24",
  contractor: "#f97316",
  consultant: "#a78bfa",
  admin:      "#f87171",
};

const STATUS_COLOR: Record<string, string> = {
  active:    "#34d399",
  on_hold:   "#fbbf24",
  completed: "#60a5fa",
  archived:  "#6b7280",
};

const NOTIF_CONFIG: Record<string, { dot: string; accent: string; label: string }> = {
  payment_ready:       { dot: "£", accent: "#059669", label: "Release payment" },
  approval_required:   { dot: "✓", accent: "#2563eb", label: "Sign-off needed" },
  evidence_required:   { dot: "📎", accent: "#d97706", label: "Evidence needed" },
  funding_gap:         { dot: "!", accent: "#dc2626", label: "Funds short" },
  variation_submitted: { dot: "↕", accent: "#7c3aed", label: "Contract change" },
  dispute_raised:      { dot: "⚠", accent: "#ea580c", label: "Dispute raised" },
};
const DEFAULT_NOTIF = { dot: "•", accent: "#94a3b8", label: "Update" };

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ label, value, color, sub }: Metric) {
  return (
    <div
      className="rounded-[18px] px-4 py-4"
      style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: "rgba(13,17,68,0.4)" }}>{sub}</p>
      )}
    </div>
  );
}

function AttentionPanel({ items }: { items: AttentionItems }) {
  const total = items.stagesReadyToRelease.length + items.disputesNeedingAction.length;
  if (total === 0) return null;

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ border: "1px solid rgba(217,119,6,0.3)", backgroundColor: "rgba(251,191,36,0.04)" }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3"
        style={{ borderBottom: "1px solid rgba(217,119,6,0.15)", backgroundColor: "rgba(251,191,36,0.07)" }}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: "#d97706" }}
        >
          {total}
        </span>
        <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
          {total === 1 ? "1 item needs your attention" : `${total} items need your attention`}
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(217,119,6,0.12)" }}>
        {items.stagesReadyToRelease.map((s) => (
          <Link
            key={s.stageId}
            href={`/projects/${s.projectId}/stages/${s.stageId}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-amber-50/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white" style={{ backgroundColor: "#059669" }}>£</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>
                Payment ready — {gbp.format(s.value)}
              </p>
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{s.stageName} · {s.projectName}</p>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: "#059669" }}>Release →</span>
          </Link>
        ))}
        {items.disputesNeedingAction.map((d) => (
          <Link
            key={d.disputeId}
            href={`/projects/${d.projectId}/stages/${d.stageId}/disputes/${d.disputeId}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-amber-50/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white" style={{ backgroundColor: "#dc2626" }}>!</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>
                Dispute — {d.stageName}
              </p>
              <p className="truncate text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{d.reason} · {d.projectName}</p>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: "#dc2626" }}>Review →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardClient({
  userName,
  userRole,
  metrics,
  recentNotifications,
  projects,
  attentionItems,
  canCreateProject,
}: {
  userName: string;
  userRole: AppRole | null;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalCommitted: number;
    totalDrawn: number;
    totalWalletAvailable: number;
    pendingActions: number;
  };
  recentNotifications: RecentNotification[];
  projects: Project[];
  attentionItems: AttentionItems | null;
  canCreateProject: boolean;
}) {
  const router = useRouter();

  const roleColor = userRole ? (ROLE_COLOR[userRole] ?? "#94a3b8") : "#94a3b8";
  const roleLabel = userRole ? (ROLE_LABELS[userRole] ?? userRole) : "";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const metricCards: Metric[] = [
    {
      label:  "Total committed",
      value:  compactGbp(metrics.totalCommitted),
      color:  "var(--brand-navy, #0D1144)",
      sub:    `across ${metrics.totalProjects} project${metrics.totalProjects !== 1 ? "s" : ""}`,
    },
    {
      label:  "Released to date",
      value:  compactGbp(metrics.totalDrawn),
      color:  "#059669",
      sub:    metrics.totalCommitted > 0
        ? `${Math.round((metrics.totalDrawn / metrics.totalCommitted) * 100)}% drawn`
        : undefined,
    },
    {
      label:  "Active projects",
      value:  String(metrics.activeProjects),
      color:  "#2563eb",
    },
    {
      label:  "Pending actions",
      value:  String(metrics.pendingActions),
      color:  metrics.pendingActions > 0 ? "#d97706" : "rgba(13,17,68,0.35)",
      sub:    metrics.pendingActions > 0 ? "unread notifications" : "all clear",
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
              {greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: roleColor + "18", color: roleColor, border: `1px solid ${roleColor}33` }}
              >
                {roleLabel}
              </span>
              <span className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>
                {metrics.activeProjects} active project{metrics.activeProjects !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {canCreateProject && (
            <Link
              href="/projects/new"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
            >
              + New project
            </Link>
          )}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricCards.map((m) => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Attention panel */}
        {attentionItems && <AttentionPanel items={attentionItems} />}

        {/* Recent notifications */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
              Recent actions
            </p>
            <Link href="/inbox" className="text-xs font-medium transition hover:opacity-70" style={{ color: "#2563eb" }}>
              View all →
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div
              className="rounded-[18px] px-5 py-6 text-center"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>All clear</p>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>No pending actions right now.</p>
            </div>
          ) : (
            <div
              className="rounded-[18px] overflow-hidden divide-y"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
            >
              {recentNotifications.map((n) => {
                const cfg = NOTIF_CONFIG[n.type] ?? DEFAULT_NOTIF;
                return (
                  <button
                    key={n.id}
                    onClick={() => n.action_url && router.push(n.action_url)}
                    disabled={!n.action_url}
                    className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition hover:bg-neutral-50 disabled:cursor-default"
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: cfg.accent + "15", color: cfg.accent }}
                    >
                      {cfg.dot}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.accent }}>
                        {cfg.label}
                      </p>
                      {n.entity_name && (
                        <p className="text-sm font-medium leading-snug" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          {n.entity_name}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{n.message}</p>
                    </div>
                    <p className="shrink-0 text-[10px] pt-0.5" style={{ color: "rgba(13,17,68,0.35)" }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>
              Your projects
            </p>
            <Link href="/projects" className="text-xs font-medium transition hover:opacity-70" style={{ color: "#2563eb" }}>
              View all →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div
              className="rounded-[18px] px-5 py-8 text-center"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
            >
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>No projects yet.</p>
              {canCreateProject && (
                <Link
                  href="/projects/new"
                  className="mt-3 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
                >
                  Create your first project
                </Link>
              )}
            </div>
          ) : (
            <div
              className="rounded-[18px] overflow-hidden divide-y"
              style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)" }}
            >
              {projects.slice(0, 6).map((p) => {
                const statusColor = STATUS_COLOR[p.status] ?? "#94a3b8";
                const progress = p.totalStages > 0
                  ? Math.round((p.completedStages / p.totalStages) * 100)
                  : 0;

                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-neutral-50"
                  >
                    {/* Status dot */}
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor }} />

                    {/* Name + address */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {p.name}
                      </p>
                      {p.address && (
                        <p className="text-xs truncate" style={{ color: "rgba(13,17,68,0.45)" }}>{p.address}</p>
                      )}
                    </div>

                    {/* Progress bar */}
                    {p.totalStages > 0 && (
                      <div className="hidden sm:flex items-center gap-2 shrink-0 w-24">
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(13,17,68,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: "#34d399" }} />
                        </div>
                        <span className="text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>
                          {p.completedStages}/{p.totalStages}
                        </span>
                      </div>
                    )}

                    {/* Value */}
                    {p.totalValue > 0 && (
                      <p className="hidden md:block shrink-0 text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                        {compactGbp(p.totalValue)}
                      </p>
                    )}

                    <span className="shrink-0 text-xs" style={{ color: "rgba(13,17,68,0.25)" }}>›</span>
                  </Link>
                );
              })}
              {projects.length > 6 && (
                <Link
                  href="/projects"
                  className="flex items-center justify-center px-5 py-3 text-xs font-medium transition hover:bg-neutral-50"
                  style={{ color: "rgba(13,17,68,0.45)" }}
                >
                  +{projects.length - 6} more projects
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
