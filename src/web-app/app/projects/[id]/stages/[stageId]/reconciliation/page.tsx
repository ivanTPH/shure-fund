"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";

type StageInfo = { id: string; name: string; value: number; status: string };

type Approval = {
  id: string;
  role: string;
  decision: string;
  certifiedAmount: number | null;
  notes: string | null;
  approver: { full_name: string } | null;
};

type EvidenceItem = {
  id: string;
  name: string;
  signedUrl: string | null;
  status: string;
  uploadedAt: string;
  uploadedBy: { full_name: string } | null;
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const ROLE_LABEL: Record<string, string> = {
  commercial:   "Commercial sign-off",
  professional: "Consultant / professional",
  treasury:     "Funder / treasury",
};

const APPROVAL_COLOR: Record<string, string> = {
  approved: "#059669",
  returned: "#ea580c",
  rejected: "#dc2626",
  pending:  "#64748b",
};

const EVIDENCE_STATUS_COLOR: Record<string, string> = {
  accepted: "#059669",
  rejected: "#dc2626",
  pending:  "#d97706",
  uploaded: "#2563eb",
};

export default function ReconciliationPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();

  const [stage, setStage]       = useState<StageInfo | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stageRes, approvalsRes, evRes] = await Promise.all([
          fetch(`/api/stages/${stageId}`),
          fetch(`/api/stages/${stageId}/approvals`),
          fetch(`/api/evidence?stageId=${stageId}`),
        ]);
        const [stageData, approvalsData, evData] = await Promise.all([
          stageRes.json(),
          approvalsRes.json(),
          evRes.json(),
        ]);
        if (stageRes.ok)     setStage(stageData.stage ?? null);
        if (approvalsRes.ok) setApprovals(approvalsData.approvals ?? []);
        if (evRes.ok)        setEvidence(evData.evidence ?? []);
      } catch {
        setError("Failed to load reconciliation data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [stageId]);

  // Most conservative certified amount across all approved sign-offs
  const certifiedAmount = (() => {
    const certs = approvals
      .filter((a) => a.decision === "approved" && a.certifiedAmount !== null)
      .map((a) => Number(a.certifiedAmount));
    if (certs.length === 0) return stage?.value ?? 0;
    return Math.min(...certs);
  })();

  const contracted = stage?.value ?? 0;
  const variance   = certifiedAmount - contracted;

  const accepted = evidence.filter((e) => e.status === "accepted");
  const pending  = evidence.filter((e) => e.status !== "accepted" && e.status !== "rejected");
  const rejected = evidence.filter((e) => e.status === "rejected");

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
          <Skeleton.Stage />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium hover:underline"
          style={{ color: "rgba(13,17,68,0.45)" }}
        >
          ← Back to stage
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#0D1144" }}>Reconciliation</h1>
          {stage && (
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
              {stage.name}
              {stage.status === "released" && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.25)" }}
                >
                  Released
                </span>
              )}
            </p>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
            {error}
          </p>
        )}

        <div className="space-y-6">
          {/* ── Financial reconciliation ──────────────────────────────────── */}
          <div
            className="rounded-[20px] p-5"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Financial summary
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Contracted value</p>
                <p className="mt-1 text-lg font-bold" style={{ color: "#0D1144" }}>{gbp.format(contracted)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Certified amount</p>
                <p className="mt-1 text-lg font-bold" style={{ color: "#059669" }}>{gbp.format(certifiedAmount)}</p>
                <p className="mt-0.5 text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>Most conservative sign-off</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Variance</p>
                <p
                  className="mt-1 text-lg font-bold"
                  style={{ color: variance < 0 ? "#ea580c" : variance > 0 ? "#059669" : "#0D1144" }}
                >
                  {variance === 0 ? "—" : `${variance > 0 ? "+" : ""}${gbp.format(variance)}`}
                </p>
                {variance < 0 && (
                  <p className="mt-0.5 text-[10px]" style={{ color: "#ea580c" }}>Below contracted</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Approval chain ────────────────────────────────────────────── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Approval chain
            </p>
            {approvals.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No approval records.</p>
            ) : (
              <div className="space-y-2">
                {approvals.map((ap) => {
                  const color = APPROVAL_COLOR[ap.decision] ?? "#64748b";
                  return (
                    <div
                      key={ap.id}
                      className="flex items-start gap-3 rounded-2xl px-4 py-3"
                      style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: color + "22", color }}
                      >
                        {ap.decision === "approved" ? "✓" : ap.decision === "rejected" ? "✗" : "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#0D1144" }}>{ROLE_LABEL[ap.role] ?? ap.role}</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>{ap.approver?.full_name ?? "—"}</p>
                        {ap.certifiedAmount !== null && (
                          <p className="text-xs mt-0.5 font-semibold" style={{ color }}>
                            Certified {gbp.format(ap.certifiedAmount)}
                          </p>
                        )}
                        {ap.notes && (
                          <p className="mt-1 text-xs italic" style={{ color: "rgba(13,17,68,0.55)" }}>{ap.notes}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {ap.decision}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Evidence ──────────────────────────────────────────────────── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Evidence
            </p>

            {/* Summary pills */}
            {evidence.length > 0 && (
              <div className="mb-3 flex gap-3">
                {[
                  { label: "Accepted", count: accepted.length, color: "#059669" },
                  { label: "Pending",  count: pending.length,  color: "#d97706" },
                  { label: "Rejected", count: rejected.length, color: "#dc2626" },
                ].map(({ label, count, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl px-4 py-2.5 text-center"
                    style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", minWidth: "5rem" }}
                  >
                    <p className="text-lg font-bold" style={{ color }}>{count}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {evidence.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No evidence uploaded for this stage.</p>
            ) : (
              <div className="space-y-2">
                {evidence.map((ev) => {
                  const color = EVIDENCE_STATUS_COLOR[ev.status] ?? "#64748b";
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: "#0D1144" }}>{ev.name}</p>
                        <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                          {ev.uploadedBy?.full_name ?? "Unknown"} · {fmt.format(new Date(ev.uploadedAt))}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-3">
                        {ev.signedUrl && (
                          <a
                            href={ev.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] hover:underline"
                            style={{ color: "#2563eb" }}
                          >
                            View
                          </a>
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-center pb-4" style={{ color: "rgba(13,17,68,0.35)" }}>
            This reconciliation record is read-only and reflects the approved state at the time of release.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
