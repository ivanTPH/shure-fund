"use client";

/**
 * Approval chain configuration — /projects/[id]/contracts/[contractId]/approval-chain
 *
 * Shows the three approval roles (Commercial, Professional, Treasury) for every
 * payment stage in the contract. Admin / developer can pre-assign a specific
 * project member to each role slot, creating a pending approval record so the
 * right person receives the sign-off request when the stage reaches
 * awaiting_approval.
 *
 * Read-only for all other roles.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalRole = "commercial" | "professional" | "treasury";

type UserRef = { id: string; full_name: string; email: string; role?: string };

type ApprovalRecord = {
  id: string;
  role: ApprovalRole;
  decision: "pending" | "approved" | "rejected" | "returned";
  notes: string | null;
  certifiedAmount: number | null;
  createdAt: string;
  approvedBy: UserRef | null;
};

type Stage = {
  id: string;
  name: string;
  value: number;
  status: string;
  approvals: ApprovalRecord[];
};

type Approver = { memberId: string; projectRole: string; user: UserRef | null };

type ChainData = {
  contract: { id: string; totalValue: number; status: string; contractor: UserRef | null };
  stages: Stage[];
  approvers: { commercial: Approver[]; professional: Approver[]; treasury: Approver[] };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const APPROVAL_ROLES: { key: ApprovalRole; label: string; desc: string; appRoles: string[] }[] = [
  { key: "commercial",   label: "Commercial",  desc: "Commercial manager / cost controller", appRoles: ["commercial"] },
  { key: "professional", label: "Professional", desc: "Consultant / quantity surveyor",       appRoles: ["consultant"] },
  { key: "treasury",     label: "Treasury",     desc: "Funder / project owner sign-off",      appRoles: ["funder", "developer"] },
];

const DECISION_COLOR: Record<string, string> = {
  approved: "#059669",
  rejected: "#dc2626",
  returned: "#ea580c",
  pending:  "#64748b",
};

const DECISION_ICON: Record<string, string> = {
  approved: "✓",
  rejected: "✗",
  returned: "↩",
  pending:  "·",
};

const STATUS_COLOR: Record<string, string> = {
  draft:                "#94a3b8",
  in_progress:          "#d97706",
  awaiting_approval:    "#7c3aed",
  returned:             "#ea580c",
  disputed:             "#dc2626",
  available_to_release: "#059669",
  released:             "#16a34a",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApprovalChainPage() {
  const { id: projectId, contractId } = useParams<{ id: string; contractId: string }>();

  const [data, setData]           = useState<ChainData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  // Seeding state per slot key `${stageId}-${role}`
  const [seeding, setSeeding]       = useState<Record<string, boolean>>({});
  const [seedError, setSeedError]   = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/approval-chain`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to load approval chain."); return; }
      setData(json);
      // Pre-fill selections from existing pending approvals
      const initial: Record<string, string> = {};
      for (const stage of json.stages ?? []) {
        for (const ap of stage.approvals ?? []) {
          if (ap.decision === "pending" && ap.approvedBy?.id) {
            initial[`${stage.id}-${ap.role}`] = ap.approvedBy.id;
          }
        }
      }
      setSelections(initial);
    } catch {
      setError("Network error loading approval chain.");
    } finally {
      setLoading(false);
    }
  }, [projectId, contractId]);

  useEffect(() => {
    load();
    createClient().auth.getUser().then(({ data: { user } }) => {
      const r = user ? getRole(user) : null;
      setCanManage(r === "admin" || r === "developer");
    });
  }, [load]);

  async function seedApproval(stageId: string, approvalRole: ApprovalRole, userId: string) {
    const key = `${stageId}-${approvalRole}`;
    setSeedError(null);
    setSeeding((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/approval-chain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, approvalRole, userId }),
      });
      const json = await res.json();
      if (!res.ok) { setSeedError(json.error ?? "Failed to assign approver."); return; }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stages: prev.stages.map((s) => {
            if (s.id !== stageId) return s;
            const exists = s.approvals.find((a) => a.role === approvalRole);
            if (exists) {
              return {
                ...s,
                approvals: s.approvals.map((a) =>
                  a.role === approvalRole
                    ? { ...a, approvedBy: json.approval.approvedBy, decision: "pending" as const }
                    : a,
                ),
              };
            }
            return { ...s, approvals: [...s.approvals, json.approval] };
          }),
        };
      });
    } catch {
      setSeedError("Network error — please try again.");
    } finally {
      setSeeding((prev) => ({ ...prev, [key]: false }));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading approval chain…</p>
      </div>
    </AppShell>
  );

  if (error || !data) return (
    <AppShell>
      <div className="min-h-screen px-4 py-8">
        <Link href={`/projects/${projectId}/contracts/${contractId}`} className="text-xs hover:underline" style={{ color: "rgba(13,17,68,0.45)" }}>
          ← Back to contract
        </Link>
        <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
          <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Not found."}</p>
        </div>
      </div>
    </AppShell>
  );

  const { contract, stages, approvers } = data;

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-3xl mx-auto">

        {/* Header */}
        <Link href={`/projects/${projectId}/contracts/${contractId}`} className="text-xs font-medium hover:underline" style={{ color: "rgba(13,17,68,0.45)" }}>
          ← Back to contract
        </Link>

        <div className="mt-4 mb-2">
          <h1 className="text-2xl font-bold" style={{ color: "#0D1144" }}>Approval chain</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            Three sign-offs are required before any payment stage can be released:{" "}
            <span className="font-semibold">Commercial</span>,{" "}
            <span className="font-semibold">Professional</span>, and{" "}
            <span className="font-semibold">Treasury</span>.
            {canManage && " Assign approvers to each role below."}
          </p>
        </div>

        {contract.contractor && (
          <p className="mb-6 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
            Contractor: <span className="font-medium" style={{ color: "#0D1144" }}>{contract.contractor.full_name}</span>
          </p>
        )}

        {seedError && (
          <div className="mb-4 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-xs" style={{ color: "#dc2626" }}>{seedError}</p>
          </div>
        )}

        {/* Available approvers legend */}
        <div className="mb-6 rounded-[20px] p-5" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(13,17,68,0.45)" }}>
            Project members available per role
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {APPROVAL_ROLES.map(({ key, label, desc, appRoles }) => {
              const list = approvers[key] ?? [];
              return (
                <div key={key}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#0D1144" }}>{label}</p>
                  <p className="text-[10px] mb-2" style={{ color: "rgba(13,17,68,0.45)" }}>{desc}</p>
                  {list.length === 0 ? (
                    <p className="text-xs italic" style={{ color: "rgba(13,17,68,0.4)" }}>
                      No {appRoles.join("/")} members on project
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {list.map((a) => (
                        <div key={a.memberId} className="flex items-center gap-2">
                          <div
                            className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ backgroundColor: "#0D1144" }}
                          >
                            {(a.user?.full_name ?? "?")[0].toUpperCase()}
                          </div>
                          <span className="text-xs truncate" style={{ color: "#0D1144" }}>
                            {a.user?.full_name ?? a.user?.email ?? "Unknown"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stages */}
        {stages.length === 0 ? (
          <div className="rounded-[20px] px-6 py-10 text-center" style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}>
            <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No stages on this contract yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage) => {
              const stageColor = STATUS_COLOR[stage.status] ?? "#94a3b8";
              const approvalMap = Object.fromEntries(stage.approvals.map((a) => [a.role, a])) as Record<ApprovalRole, ApprovalRecord | undefined>;
              const allApproved = APPROVAL_ROLES.every((r) => approvalMap[r.key]?.decision === "approved");
              const anyRejected = APPROVAL_ROLES.some((r) => approvalMap[r.key]?.decision === "rejected");

              return (
                <div
                  key={stage.id}
                  className="rounded-[20px] overflow-hidden"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                >
                  {/* Stage header */}
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "#0D1144" }}>{stage.name}</p>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: stageColor + "18", color: stageColor }}
                        >
                          {stage.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="shrink-0 text-sm font-bold" style={{ color: "#0D1144" }}>{gbp.format(stage.value)}</p>
                    </div>
                  </div>

                  {/* Role rows */}
                  <div>
                    {APPROVAL_ROLES.map(({ key, label }, idx) => {
                      const existing = approvalMap[key];
                      const slotKey = `${stage.id}-${key}`;
                      const isBusy = seeding[slotKey] ?? false;
                      const selection = selections[slotKey] ?? "";
                      const availableApprovers = approvers[key] ?? [];
                      const decisionColor = existing ? (DECISION_COLOR[existing.decision] ?? "#64748b") : "#64748b";
                      const isDecided = existing && existing.decision !== "pending";

                      return (
                        <div
                          key={key}
                          className="px-5 py-3 flex items-center gap-3"
                          style={{ borderTop: idx > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}
                        >
                          {/* Role label */}
                          <div className="w-24 shrink-0">
                            <p className="text-xs font-semibold" style={{ color: "rgba(13,17,68,0.6)" }}>{label}</p>
                          </div>

                          {/* Status */}
                          <div className="flex-1 min-w-0">
                            {existing ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: decisionColor + "20", color: decisionColor }}
                                >
                                  {DECISION_ICON[existing.decision]}
                                </span>
                                <span className="text-xs font-medium truncate" style={{ color: "#0D1144" }}>
                                  {existing.approvedBy?.full_name ?? "Unassigned"}
                                </span>
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider" style={{ color: decisionColor }}>
                                  {existing.decision}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: "rgba(13,17,68,0.35)" }}>Not assigned</p>
                            )}
                          </div>

                          {/* Assign control */}
                          {canManage && !isDecided && (
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={selection}
                                onChange={(e) => setSelections((prev) => ({ ...prev, [slotKey]: e.target.value }))}
                                disabled={isBusy || availableApprovers.length === 0}
                                className="rounded-xl px-2 py-1.5 text-xs outline-none"
                                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "#0D1144", minWidth: "130px" }}
                              >
                                <option value="">
                                  {availableApprovers.length === 0 ? "No members" : "Select…"}
                                </option>
                                {availableApprovers.map((a) => (
                                  <option key={a.memberId} value={a.user?.id ?? ""}>
                                    {a.user?.full_name ?? a.user?.email ?? "Unknown"}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => selection && seedApproval(stage.id, key, selection)}
                                disabled={!selection || isBusy}
                                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
                                style={{ backgroundColor: "#0D1144" }}
                              >
                                {isBusy ? "…" : existing ? "Reassign" : "Assign"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Chain completion banner */}
                  {(allApproved || anyRejected) && (
                    <div
                      className="px-5 py-2 text-xs font-semibold"
                      style={{
                        borderTop: "1px solid var(--surface-border, #e4e7f0)",
                        backgroundColor: allApproved ? "rgba(5,150,105,0.06)" : "rgba(220,38,38,0.06)",
                        color: allApproved ? "#059669" : "#dc2626",
                      }}
                    >
                      {allApproved
                        ? "✓ All sign-offs complete — stage cleared for release"
                        : "✗ Approval chain blocked"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
