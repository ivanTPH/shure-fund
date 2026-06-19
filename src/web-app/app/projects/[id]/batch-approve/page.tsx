"use client";

/**
 * /projects/[id]/batch-approve
 *
 * Batch approval hub for commercial, consultant (professional), funder/developer (treasury),
 * and admin.
 *
 * Shows all awaiting_approval stages for the project. The user selects some or all,
 * picks a decision (approved / rejected / returned), optionally adds notes and
 * certified amounts, then submits in a single bulk request.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { useToast } from "@/app/components/ToastContext";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = {
  id: string;
  contractId: string;
  name: string;
  value: number;
  status: string;
  contractorName: string;
};

type Decision = "approved" | "rejected" | "returned";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;
const gbp   = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const DECISION_CONFIG: Record<Decision, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: "Approve all selected",  color: "#059669", bg: "rgba(5,150,105,0.08)",  border: "rgba(5,150,105,0.3)"  },
  rejected: { label: "Reject all selected",   color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.25)" },
  returned: { label: "Return all selected",   color: "#ea580c", bg: "rgba(234,88,12,0.06)", border: "rgba(234,88,12,0.25)" },
};

const ROLE_LABEL: Record<string, string> = {
  commercial: "commercial sign-off",
  consultant: "professional sign-off",
  funder:     "treasury sign-off",
  developer:  "treasury sign-off",
  admin:      "all roles",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchApprovePage() {
  const params    = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const router    = useRouter();
  const { toast } = useToast();

  const [stages, setStages]         = useState<Stage[]>([]);
  const [role, setRole]             = useState<AppRole | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Selection
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [decision, setDecision]     = useState<Decision>("approved");
  const [notes, setNotes]           = useState("");
  const [certAmt, setCertAmt]       = useState<string>("");  // global certified amount

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults]       = useState<Array<{ stageId: string; success: boolean; error?: string }> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load awaiting_approval stages via project dashboard
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/projects/${projectId}/dashboard`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      const awaiting: Stage[] = (data.contracts ?? []).flatMap((c: {
        id: string;
        contractorName: string;
        stages: Array<{ id: string; name: string; value: number; status: string }>;
      }) =>
        (c.stages ?? [])
          .filter((s) => s.status === "awaiting_approval")
          .map((s) => ({
            id: s.id,
            contractId: c.id,
            name: s.name,
            value: s.value,
            status: s.status,
            contractorName: c.contractorName,
          })),
      );

      setStages(awaiting);
    } catch {
      setError("Failed to load stages.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const r = getRole(user);
      setRole(r ?? null);
      if (!r || r === "contractor") {
        router.push(`/projects/${projectId}`);
      }
    });
    load();
  }, [projectId, router, load]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  function toggleStage(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(stages.map(s => s.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    if (decision === "returned" && !notes.trim()) {
      setSubmitError("Notes are required when returning stages.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResults(null);

    const body: Record<string, unknown> = {
      stageIds: [...selected],
      decision,
    };
    if (notes.trim()) body.notes = notes.trim();
    const parsedCert = parseFloat(certAmt);
    if (!isNaN(parsedCert) && parsedCert > 0) body.certifiedAmount = parsedCert;

    try {
      const res  = await fetch(`/api/projects/${projectId}/approvals/bulk`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed.");
      } else {
        setResults(data.results);
        const n = [...selected].length;
        toast(
          decision === "approved"
            ? `${n} stage${n !== 1 ? "s" : ""} approved`
            : decision === "returned"
            ? `${n} stage${n !== 1 ? "s" : ""} returned`
            : `${n} stage${n !== 1 ? "s" : ""} rejected`,
          decision === "approved" ? "success" : "info",
        );
        setSelected(new Set());
        setNotes("");
        setCertAmt("");
        await load(); // refresh stage list
      }
    } catch {
      setSubmitError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <p className="text-sm" style={{ color: muted }}>Loading stages…</p>
        </div>
      </AppShell>
    );
  }

  const decisionCfg = DECISION_CONFIG[decision];
  const canSubmit   = selected.size > 0 && (decision !== "returned" || notes.trim().length > 0);

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
            <Link href={`/projects/${projectId}`} className="transition hover:opacity-70">Project</Link>
            <span>/</span>
            <span>Batch sign-off</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: navy }}>Batch sign-off</h1>
              <p className="mt-0.5 text-sm" style={{ color: muted }}>
                {role ? `Submitting as ${ROLE_LABEL[role] ?? role}` : ""}
                {stages.length > 0 ? ` · ${stages.length} stage${stages.length !== 1 ? "s" : ""} awaiting` : ""}
              </p>
            </div>
          </div>

          {/* Success results */}
          {results && (
            <div className="rounded-[20px] px-5 py-4 space-y-1" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                {results.filter(r => r.success).length} approved · {results.filter(r => !r.success).length} failed
              </p>
              {results.filter(r => !r.success).map(r => (
                <p key={r.stageId} className="text-xs" style={{ color: "#dc2626" }}>
                  Stage {r.stageId.slice(0, 8)}… — {r.error}
                </p>
              ))}
            </div>
          )}

          {/* No stages */}
          {stages.length === 0 ? (
            <div className="rounded-[24px] px-6 py-12 text-center" style={card}>
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm font-semibold" style={{ color: navy }}>No stages awaiting sign-off</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>All clear — come back when stages are submitted for approval.</p>
              <Link
                href={`/projects/${projectId}`}
                className="mt-4 inline-block text-xs font-semibold transition hover:opacity-70"
                style={{ color: muted }}
              >
                ← Back to project
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stage list */}
              <div className="rounded-[20px] overflow-hidden" style={card}>
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                    Select stages · {selected.size} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={selectAll} className="text-[11px] font-semibold transition hover:opacity-70" style={{ color: navy }}>
                      Select all
                    </button>
                    {selected.size > 0 && (
                      <button type="button" onClick={clearAll} className="text-[11px] font-semibold transition hover:opacity-70" style={{ color: muted }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {stages.map((stage) => {
                    const isSelected = selected.has(stage.id);
                    return (
                      <label
                        key={stage.id}
                        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition hover:bg-neutral-50"
                        style={{ backgroundColor: isSelected ? "rgba(37,99,235,0.02)" : undefined }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStage(stage.id)}
                          className="h-4 w-4 rounded accent-blue-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: navy }}>{stage.name}</p>
                          <p className="text-xs" style={{ color: muted }}>{stage.contractorName}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold" style={{ color: navy }}>{gbp.format(stage.value)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Decision + notes */}
              <div className="rounded-[20px] p-5 space-y-4" style={card}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: muted }}>Decision</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(DECISION_CONFIG) as Decision[]).map((d) => {
                      const cfg = DECISION_CONFIG[d];
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDecision(d)}
                          className="rounded-xl px-4 py-2 text-xs font-bold transition"
                          style={{
                            color:           d === decision ? cfg.color : muted,
                            backgroundColor: d === decision ? cfg.bg    : "transparent",
                            border:          `1px solid ${d === decision ? cfg.border : "var(--surface-border, #e4e7f0)"}`,
                          }}
                        >
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Certified amount */}
                {decision === "approved" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: muted }}>
                      Certified amount (optional — applies to all selected)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={certAmt}
                      onChange={e => setCertAmt(e.target.value)}
                      placeholder="Leave blank to use stage value"
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={{
                        border: "1px solid var(--surface-border, #e4e7f0)",
                        backgroundColor: "#f7f8fc",
                        color: navy,
                      }}
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: muted }}>
                    Notes {decision === "returned" && <span style={{ color: "#dc2626" }}>*</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={decision === "returned" ? "Explain what needs to be fixed…" : "Optional notes for all selected stages"}
                    className="w-full resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{
                      border: "1px solid var(--surface-border, #e4e7f0)",
                      backgroundColor: "#f7f8fc",
                      color: navy,
                    }}
                  />
                </div>

                {submitError && (
                  <p className="text-xs" style={{ color: "#dc2626" }}>{submitError}</p>
                )}

                {/* Submit */}
                <div className="flex items-center justify-between gap-3 pt-2" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                  <p className="text-xs" style={{ color: muted }}>
                    {selected.size === 0 ? "Select at least one stage" : `${selected.size} stage${selected.size !== 1 ? "s" : ""} selected`}
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: decisionCfg.color }}
                  >
                    {submitting ? "Submitting…" : decisionCfg.label}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Back */}
          {stages.length > 0 && (
            <div className="pt-2">
              <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: muted }}>
                ← Back to project
              </Link>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
