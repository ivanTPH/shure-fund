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
  approved: "#34d399",
  returned: "#fbbf24",
  rejected: "#f87171",
  pending:  "#94a3b8",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReleasePaymentPage() {
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();
  const router = useRouter();

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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-sm text-neutral-500">Loading release details…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
          <Link href={`/projects/${projectId}`} className="text-xs text-neutral-400 hover:text-white">← Back to project</Link>
          <div className="mt-6 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (released) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#0d1144" }}>
          <div className="text-center max-w-xs">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(52,211,153,0.15)", border: "2px solid #34d399" }}
            >
              <span className="text-4xl text-green-400">£</span>
            </div>
            <p className="text-xl font-bold text-white">Payment released</p>
            <p className="mt-2 text-sm text-neutral-400">
              {gbp.format(certifiedAmount)} authorised for {stage?.name}.
            </p>
            <p className="mt-4 text-xs text-neutral-600">Taking you back to the project…</p>
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
      <div
        className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto"
        style={{ backgroundColor: "#0d1144" }}
      >
        {/* Back */}
        <Link
          href={`/projects/${projectId}/stages/${stageId}/approve`}
          className="text-xs font-medium text-neutral-400 hover:text-white"
        >
          ← Back to approval screen
        </Link>

        {/* Heading */}
        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Release payment</h1>
          <p className="mt-1 text-sm text-neutral-400">
            This is a payment authorisation. Funds will be released from the project wallet immediately.
          </p>
        </div>

        <div className="space-y-5">
          {/* Stage summary */}
          <div
            className="rounded-[20px] p-5"
            style={{ border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Stage</p>
            <p className="mt-1 text-xl font-bold text-white">{stage?.name}</p>
            {stage?.contractorName && (
              <p className="mt-0.5 text-sm text-neutral-400">{stage.contractorName}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Contracted value</p>
                <p className="mt-1 text-lg font-bold text-white">{gbp.format(stage?.value ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Amount to release</p>
                <p className="mt-1 text-lg font-bold text-green-400">{gbp.format(certifiedAmount)}</p>
                {certifiedAmount !== (stage?.value ?? certifiedAmount) && (
                  <p className="text-[10px] text-amber-400 mt-0.5">Certified below contracted value</p>
                )}
              </div>
            </div>
          </div>

          {/* Approval chain */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Approval chain — all required sign-offs
            </p>
            {approvals.length === 0 ? (
              <p className="text-sm text-neutral-500">No approval records found.</p>
            ) : (
              <div className="space-y-2">
                {approvals.map((ap) => {
                  const color = APPROVAL_COLOR[ap.decision] ?? "#94a3b8";
                  return (
                    <div
                      key={ap.id}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ border: `1px solid ${color}33`, backgroundColor: color + "0d" }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: color + "33", color }}
                      >
                        {ap.decision === "approved" ? "✓" : ap.decision === "rejected" ? "✗" : "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{ROLE_LABEL[ap.role] ?? ap.role}</p>
                        <p className="text-xs text-neutral-400">{ap.approver?.full_name ?? "—"}</p>
                        {ap.certifiedAmount !== null && (
                          <p className="text-xs text-neutral-300 mt-0.5">
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
              style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Wallet impact</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Current available balance</span>
                  <span className="font-bold text-white">{gbp.format(wallet.available)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Amount to release</span>
                  <span className="font-bold">− {gbp.format(certifiedAmount)}</span>
                </div>
                <div
                  className="flex justify-between border-t border-white/10 pt-2"
                  style={{ color: (afterRelease ?? 0) < 0 ? "#f87171" : "#e5e5e5" }}
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
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <p className="text-xs font-semibold text-red-400">Insufficient funds</p>
                  <p className="text-xs text-red-300 mt-0.5">
                    The wallet does not have enough available funds to cover this release.
                    Top up the wallet before proceeding.
                  </p>
                  <Link
                    href={`/projects/${projectId}/wallet`}
                    className="mt-2 inline-block text-xs font-semibold text-red-300 hover:text-red-100 underline"
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
              style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Not yet cleared for release</p>
              <p className="mt-1 text-sm text-neutral-300">
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
              style={{ border: `1px solid ${confirmed ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.12)"}`, backgroundColor: confirmed ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)" }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-green-400"
              />
              <p className="text-sm text-neutral-200">
                I confirm I am authorising the release of{" "}
                <span className="font-bold text-white">{gbp.format(certifiedAmount)}</span>{" "}
                for <span className="font-bold text-white">{stage?.name}</span>.
                I understand this action is recorded in the immutable audit trail and cannot be undone.
              </p>
            </label>
          )}

          {/* Release error */}
          {releaseError && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">Release failed</p>
              <p className="mt-1 text-sm text-red-300">{releaseError}</p>
            </div>
          )}

          {/* Release button */}
          {canRelease && (
            <button
              onClick={handleRelease}
              disabled={!confirmed || releasing}
              className="w-full rounded-2xl py-4 text-sm font-bold text-white transition disabled:opacity-40 active:scale-[0.99]"
              style={{
                backgroundColor: confirmed ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${confirmed ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {releasing ? "Processing…" : `Release ${gbp.format(certifiedAmount)}`}
            </button>
          )}

          <p className="text-xs text-neutral-600 text-center pb-4">
            All payment releases are timestamped and recorded in the immutable audit trail.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
