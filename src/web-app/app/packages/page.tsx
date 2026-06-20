"use client";

/**
 * /packages — Cross-project work packages
 *
 * Shows all work packages across all accessible projects.
 * Contractors can filter to only their assigned packages.
 * Status filter: all / active / draft / on_hold / completed.
 *
 * Roles: all authenticated
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Package = {
  id: string;
  name: string;
  value: number;
  status: string;
  createdAt: string;
  stageId: string;
  stageName: string | null;
  contractId: string | null;
  projectId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
};

type Summary = {
  total: number;
  active: number;
  completed: number;
  draft: number;
  on_hold: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Draft",     bg: "rgba(100,116,139,0.1)", color: "#64748b" },
  active:    { label: "Active",    bg: "rgba(37,99,235,0.09)",  color: "#2563eb" },
  on_hold:   { label: "On hold",   bg: "rgba(234,88,12,0.09)",  color: "#ea580c" },
  completed: { label: "Completed", bg: "rgba(5,150,105,0.09)",  color: "#059669" },
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

const STATUS_FILTERS = ["all", "active", "draft", "on_hold", "completed"];
const ZERO_SUMMARY: Summary = { total: 0, active: 0, completed: 0, draft: 0, on_hold: 0 };

export default function PackagesPage() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [summary, setSummary] = useState<Summary>(ZERO_SUMMARY);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedToMe, setAssignedToMe] = useState(false);

  const load = useCallback(async (status = "all", onlyMine = false) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (onlyMine) params.set("assignedToMe", "true");
    const qs = params.toString();
    const url = `/api/packages${qs ? `?${qs}` : ""}`;
    const res = await fetch(url);
    if (res.status === 401) { router.replace("/auth/login"); return; }
    if (res.status === 403) { router.replace("/projects"); return; }
    const data = await res.json() as { packages: Package[]; summary: Summary };
    setPackages(data.packages ?? []);
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
      const mine = r === "contractor";
      setAssignedToMe(mine);
      await load(statusFilter, mine);
    };
    init();
  }, [load, router, statusFilter]);

  const isContractor = role === "contractor";

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Work packages
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            {isContractor ? "Packages assigned to you across all projects." : "All work packages across your projects."}
          </p>
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
                { label: "Active",    value: summary.active,    color: "#2563eb" },
                { label: "On hold",   value: summary.on_hold,   color: "#ea580c" },
                { label: "Completed", value: summary.completed, color: "#059669" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
                  <p className="mt-0.5 text-xl font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); load(s, assignedToMe); }}
                  className="rounded-[12px] px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    statusFilter === s
                      ? { backgroundColor: "#0D1144", color: "#fff" }
                      : { border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)", backgroundColor: "#fff" }
                  }
                >
                  {s === "on_hold" ? "On hold" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              {!isContractor && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !assignedToMe;
                    setAssignedToMe(next);
                    load(statusFilter, next);
                  }}
                  className="rounded-[12px] px-3 py-1.5 text-xs font-semibold transition ml-2"
                  style={
                    assignedToMe
                      ? { backgroundColor: "#2563eb", color: "#fff" }
                      : { border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)", backgroundColor: "#fff" }
                  }
                >
                  Assigned to me
                </button>
              )}
            </div>
          </>
        )}

        {loading ? (
          <Skeleton.CardList />
        ) : packages.length === 0 ? (
          <div
            className="rounded-[20px] px-6 py-10 text-center"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No work packages found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-[20px] px-5 py-4"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    {pkg.stageName && (
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                        {pkg.stageName}
                      </p>
                    )}
                    <p className="mt-0.5 font-semibold" style={{ color: "#0D1144" }}>
                      {pkg.name}
                    </p>
                    <p className="text-lg font-bold" style={{ color: "#0D1144" }}>
                      {gbp.format(pkg.value)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={pkg.status} />
                    {pkg.projectId && (
                      <Link
                        href={`/projects/${pkg.projectId}`}
                        className="text-[11px] font-medium hover:underline"
                        style={{ color: "#2563eb" }}
                      >
                        View project →
                      </Link>
                    )}
                  </div>
                </div>

                {pkg.assigneeName && (
                  <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                    Assigned to: <span className="font-medium">{pkg.assigneeName}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
