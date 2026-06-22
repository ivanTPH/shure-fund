"use client";

/**
 * Payment release confirmation — /projects/[id]/stages/[stageId]/release
 *
 * Visible to: funder, admin.
 * Shows the full approval chain, certified amount, and wallet impact.
 * Requires an explicit confirmation checkbox before the release button activates.
 * Calls POST /api/stages/[stageId]/transition { action: "release" }.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";
import { Skeleton } from "../../../../../components/Skeleton";
import { useToast } from "../../../../../components/ToastContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageInfo = {
  id: string;
  name: string;
  value: number;
  status: string;
  contractorName: string | null;
};

type Approval = {
  id: string;
  role: string;
  decision: string;
  certifiedAmount: number | null;
  notes: string | null;
  approver: { full_name: string; role: string } | null;
};

type WalletInfo = {
  balance: number;
  available: number;
  ringfenced: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReleasePaymentPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [stage, setStage]       = useState<StageInfo | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [wallet, setWallet]     = useState<WalletInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Release state
  const [confirmed, setConfirmed]       = useState(false);
  const [releasing, setReleasing]       = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [released, setReleased]         = useState(false);

  const load = useCallback(async () => {
    try {
      const [stageRes, approvalsRes, walletRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch(`/api/stages/${stageId}/approvals`),
        fetch(`/api/projects/${projectId}/wallet`),
      ]);

      if (!stageRes.ok) { setError("Stage not found."); return; }
      const { stage: s } = await stageRes.json();

      // The API nests contractor info inside contracts; pull it out
      const contract = Array.isArray(s.contracts) ? s.contracts[0] : s.contracts;

      setStage({
        id:             s.id,
        name:           s.name,
        value:          Number(s.value),
        status:         s.status,
        contractorName: contract?.contractor?.full_name ?? null,
      });

      if (approvalsRes.ok) {
        const { approvals: aps } = await approvalsRes.json();
        setApprovals(aps ?? []);
      }

      if (walletRes.ok) {
        const { wallet: w } = await walletRes.json();
        setWallet({
          balance:   Number(w.balance),
          available: Number(w.available_amount),
          ringfenced: Number(w.ringfenced_amount),
        });
      }
    } catch {
      setError("Network error loading release details.");
    } finally {
      setLoading(false);
    }
  }, [stageId, projectId]);

  useEffect(() => { load(); }, [load]);

  // Certified amount — most conservative approved certification
  const certifiedAmount = (() => {
    const certs = approvals
      .filter((a) => a.decision === "approved" && a.certifiedAmount !== null)
      .map((a) => Number(a.certifiedAmount));
    if (certs.length === 0) return stage?.value ?? 0;
    return Math.min(...certs);
  })();

  const allApproved = approvals.length > 0 && approvals.every((a) => a.decision === "approved");
  const canRelease  = stage?.status === "available_to_release" && allApproved;

  async function handleRelease() {
    if (!confirmed || !canRelease) return;
    setReleaseError(null);
    setReleasing(true);

    try {
      const res = await fetch(`/api/stages/${stageId}/transition`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "release" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReleaseError(data.error ?? "Release failed — please try again.");
        return;
      }
      setReleased(true);
      toast(`Payment released — ${gbp.format(certifiedAmount)} authorised`, "success");
      setTimeout(() => router.push(`/projects/${projectId}`), 2500);
    } catch {
      setReleaseError("Network error — check your connection and try again.");
    } finally {
      setReleasing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / success screens
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-xl mx-auto">
          <Skeleton.Stage />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8">
          <Link href={`/projects/${projectId}`} className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>← Back to project</Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (released) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(5,150,105,0.1)", border: "2px solid #059669" }}
            >
              <span className="text-4xl" style={{ color: "#059669" }}>£</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#0D1144" }}>Payment released</p>
            <p className="mt-2 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
              {gbp.format(certifiedAmount)} authorised for {stage?.name}.
            </p>
            <p className="mt-4 text-xs" style={{ color: "rgba(13,17,68,0.35)" }}>Taking you back to the project…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Already-released receipt — user navigated here from payment list or directly
  if (stage?.status === "released") {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "rgba(13,17,68,0.45)" }}>
            <Link href="/payments" className="hover:opacity-70 transition">← Payments</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/stages/${stageId}`} className="hover:opacity-70 transition">Stage detail</Link>
          </div>

          {/* Receipt header */}
          <div
            className="mb-6 rounded-[24px] p-6 text-center"
            style={{ backgroundColor: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(22,163,74,0.1)", border: "2px solid #16a34a" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#16a34a" }}>Payment confirmed</p>
            <p className="text-2xl font-bold" style={{ color: "#0D1144" }}>{gbp.format(certifiedAmount)}</p>
            <p className="mt-1 text-sm font-medium" style={{ color: "rgba(13,17,68,0.7)" }}>{stage.name}</p>
            {stage.contractorName && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.45)" }}>{stage.contractorName}</p>
            )}
          </div>

          {/* Sign-off chain */}
          {approvals.length > 0 && (
            <div
              className="mb-5 rounded-[20px] p-5 space-y-2"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                Sign-off chain
              </p>
              {approvals.map((ap) => {
                const color = APPROVAL_COLOR[ap.decision] ?? "#64748b";
                return (
                  <div
                    key={ap.id}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: color + "22", color }}
                    >
                      {ap.decision === "approved" ? "✓" : ap.decision === "rejected" ? "✗" : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#0D1144" }}>{ROLE_LABEL[ap.role] ?? ap.role}</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>{ap.approver?.full_name ?? "—"}</p>
                      {ap.certifiedAmount !== null && (
                        <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.65)" }}>
                          Certified {gbp.format(ap.certifiedAmount)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold uppercase" style={{ color }}>
                      {ap.decision}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/projects/${projectId}/stages/${stageId}`}
              className="rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "rgba(13,17,68,0.65)", border: "1px solid var(--surface-border, #e4e7f0)" }}
            >
              View stage
            </Link>
            <Link
              href={`/projects/${projectId}`}
              className="rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: "#0D1144", color: "#fff" }}
            >
              Back to project
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const afterRelease = wallet ? wallet.available - certifiedAmount : null;

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium hover:underline"
          style={{ color: "rgba(13,17,68,0.45)" }}
        >
          ← Back to stage
        </Link>

        {/* Heading */}
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#0D1144" }}>Release payment</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            This is a payment authorisation. Funds will be released from the project wallet immediately.
          </p>
        </div>

        <div className="space-y-5">
          {/* Stage summary */}
          <div
            className="rounded-[20px] p-5"
            style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Stage</p>
            <p className="mt-1 text-xl font-bold" style={{ color: "#0D1144" }}>{stage?.name}</p>
            {stage?.contractorName && (
              <p className="mt-0.5 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>{stage.contractorName}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Contracted value</p>
                <p className="mt-1 text-lg font-bold" style={{ color: "#0D1144" }}>{gbp.format(stage?.value ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Amount to release</p>
                <p className="mt-1 text-lg font-bold" style={{ color: "#059669" }}>{gbp.format(certifiedAmount)}</p>
                {certifiedAmount !== (stage?.value ?? certifiedAmount) && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#ea580c" }}>Certified below contracted value</p>
                )}
              </div>
            </div>
          </div>

          {/* Approval chain */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Approval chain — all required sign-offs
            </p>
            {approvals.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No approval records found.</p>
            ) : (
              <div className="space-y-2">
                {approvals.map((ap) => {
                  const color = APPROVAL_COLOR[ap.decision] ?? "#64748b";
                  return (
                    <div
                      key={ap.id}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: color + "22", color }}
                      >
                        {ap.decision === "approved" ? "✓" : ap.decision === "rejected" ? "✗" : "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#0D1144" }}>{ROLE_LABEL[ap.role] ?? ap.role}</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>{ap.approver?.full_name ?? "—"}</p>
                        {ap.certifiedAmount !== null && (
                          <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.65)" }}>
                            Certified {gbp.format(ap.certifiedAmount)}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-bold uppercase" style={{ color }}>
                        {ap.decision}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallet impact */}
          {wallet && (
            <div
              className="rounded-[20px] p-5"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Wallet impact</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "rgba(13,17,68,0.55)" }}>Current available balance</span>
                  <span className="font-bold" style={{ color: "#0D1144" }}>{gbp.format(wallet.available)}</span>
                </div>
                <div className="flex justify-between" style={{ color: "#dc2626" }}>
                  <span>Amount to release</span>
                  <span className="font-bold">− {gbp.format(certifiedAmount)}</span>
                </div>
                <div
                  className="flex justify-between pt-2"
                  style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", color: (afterRelease ?? 0) < 0 ? "#dc2626" : "#0D1144" }}
                >
                  <span>Balance after release</span>
                  <span className="font-bold">
                    {afterRelease !== null ? gbp.format(afterRelease) : "—"}
                  </span>
                </div>
              </div>
              {afterRelease !== null && afterRelease < 0 && (
                <div
                  className="mt-3 rounded-xl px-3 py-2"
                  style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>Insufficient funds</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(220,38,38,0.8)" }}>
                    The wallet does not have enough available funds to cover this release.
                    Top up the wallet before proceeding.
                  </p>
                  <Link
                    href={`/projects/${projectId}/wallet`}
                    className="mt-2 inline-block text-xs font-semibold underline"
                    style={{ color: "#dc2626" }}
                  >
                    Add funds →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Not ready warning */}
          {!canRelease && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ea580c" }}>Not yet cleared for release</p>
              <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.7)" }}>
                {stage?.status !== "available_to_release"
                  ? `Stage status is "${stage?.status?.replace(/_/g, " ")}" — it must be available to release before payment can go out.`
                  : "Not all approvals have been granted. Check the approval chain above."}
              </p>
            </div>
          )}

          {/* Confirmation checkbox */}
          {canRelease && (
            <label
              className="flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-4"
              style={{
                border: `1px solid ${confirmed ? "rgba(5,150,105,0.35)" : "var(--surface-border, #e4e7f0)"}`,
                backgroundColor: confirmed ? "rgba(5,150,105,0.06)" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ accentColor: "#059669" }}
              />
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.8)" }}>
                I confirm I am authorising the release of{" "}
                <span className="font-bold" style={{ color: "#0D1144" }}>{gbp.format(certifiedAmount)}</span>{" "}
                for <span className="font-bold" style={{ color: "#0D1144" }}>{stage?.name}</span>.
                I understand this action is recorded in the immutable audit trail and cannot be undone.
              </p>
            </label>
          )}

          {/* Release error */}
          {releaseError && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Release failed</p>
              <p className="mt-1 text-sm" style={{ color: "rgba(220,38,38,0.8)" }}>{releaseError}</p>
            </div>
          )}

          {/* Release button */}
          {canRelease && (
            <button
              onClick={handleRelease}
              disabled={!confirmed || releasing}
              className="w-full rounded-2xl py-4 text-sm font-bold text-white transition disabled:opacity-40 active:scale-[0.99]"
              style={{
                backgroundColor: confirmed ? "#059669" : "#64748b",
                border: "none",
              }}
            >
              {releasing ? "Processing…" : `Release ${gbp.format(certifiedAmount)}`}
            </button>
          )}

          <p className="text-xs text-center pb-4" style={{ color: "rgba(13,17,68,0.35)" }}>
            All payment releases are timestamped and recorded in the immutable audit trail.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
