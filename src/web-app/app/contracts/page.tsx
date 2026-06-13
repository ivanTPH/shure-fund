"use client";

/**
 * /contracts — Cross-project contracts list
 *
 * Shows all contracts across all accessible projects for the current user.
 * Allows filtering by status. Admin and developer see a link to create new contracts.
 *
 * Roles: all authenticated
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Contract = {
  id: string;
  status: string;
  totalValue: number;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
  projectAddress: string | null;
  contractorId: string | null;
  contractorName: string | null;
  contractorEmail: string | null;
  stageCount: number;
  activeStages: number;
  releasedStages: number;
};

type Summary = {
  total: number;
  active: number;
  draft: number;
  issued: number;
  accepted: number;
  completed: number;
  cancelled: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "rgba(100,116,139,0.1)",  color: "#64748b" },
  issued:    { label: "Issued",    bg: "rgba(234,88,12,0.09)",   color: "#ea580c" },
  accepted:  { label: "Accepted",  bg: "rgba(37,99,235,0.09)",   color: "#2563eb" },
  active:    { label: "Active",    bg: "rgba(5,150,105,0.09)",   color: "#059669" },
  completed: { label: "Completed", bg: "rgba(22,163,74,0.09)",   color: "#16a34a" },
  cancelled: { label: "Cancelled", bg: "rgba(220,38,38,0.09)",   color: "#dc2626" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, bg: "rgba(0,0,0,0.06)", color: "#0D1144" };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ["all", "active", "draft", "issued", "accepted", "completed", "cancelled"];
const ZERO_SUMMARY: Summary = { total: 0, active: 0, draft: 0, issued: 0, accepted: 0, completed: 0, cancelled: 0 };

export default function ContractsPage() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<Summary>(ZERO_SUMMARY);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async (status = "all") => {
    const url = `/api/contracts${status !== "all" ? `?status=${status}` : ""}`;
    const res = await fetch(url);
    if (res.status === 401) { router.replace("/auth/login"); return; }
    if (res.status === 403) { router.replace("/projects"); return; }
    const data = await res.json() as { contracts: Contract[]; summary: Summary };
    setContracts(data.contracts ?? []);
    setSummary(data.summary ?? ZERO_SUMMARY);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const r = getRole(user) as AppRole;
      setRole(r);
      await load(statusFilter);
    };
    init();
  }, [load, router, statusFilter]);

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
              Contracts
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
              All contracts across your projects.
            </p>
          </div>
          {(role === "admin" || role === "developer") && (
            <Link
              href="/projects"
              className="rounded-[12px] px-4 py-2 text-xs font-semibold"
              style={{ backgroundColor: "#0D1144", color: "#fff" }}
            >
              + New contract
            </Link>
          )}
        </div>

        {!loading && (
          <>
            {/* Summary strip */}
            <div
              className="mb-5 grid grid-cols-4 gap-3 rounded-[20px] px-5 py-4"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              {[
                { label: "Total",     value: summary.total,     color: "#0D1144" },
                { label: "Active",    value: summary.active,    color: "#059669" },
                { label: "Issued",    value: summary.issued,    color: "#ea580c" },
                { label: "Completed", value: summary.completed, color: "#16a34a" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
                  <p className="mt-0.5 text-xl font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Status filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); load(s); }}
                  className="rounded-[12px] px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    statusFilter === s
                      ? { backgroundColor: "#0D1144", color: "#fff" }
                      : { border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)", backgroundColor: "#fff" }
                  }
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
          </div>
        ) : contracts.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No contracts found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="rounded-[20px] px-5 py-4"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                      {c.projectName ?? "Unknown project"} · {c.projectAddress}
                    </p>
                    <p className="mt-0.5 text-xl font-bold" style={{ color: "#0D1144" }}>
                      {gbp.format(c.totalValue)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    {c.projectId && (
                      <Link
                        href={`/projects/${c.projectId}`}
                        className="text-[11px] font-medium hover:underline"
                        style={{ color: "#2563eb" }}
                      >
                        View project →
                      </Link>
                    )}
                  </div>
                </div>

                {c.contractorName && (
                  <p className="mb-2 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
                    Contractor: <span className="font-medium">{c.contractorName}</span>
                    {c.contractorEmail && (
                      <span className="ml-1 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                        ({c.contractorEmail})
                      </span>
                    )}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                  <span>{c.stageCount} stages</span>
                  {c.activeStages > 0 && (
                    <span style={{ color: "#2563eb" }}>{c.activeStages} in progress</span>
                  )}
                  {c.releasedStages > 0 && (
                    <span style={{ color: "#059669" }}>{c.releasedStages} released</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
