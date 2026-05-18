"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { VariationAction } from "@/lib/workflow/variationStateMachine";
import AppShell from "../../../../../components/AppShell";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

type Variation = {
  id: string;
  stage_id: string;
  description: string;
  value_change: number;
  status: string;
  approved_at: string | null;
  created_at: string;
  requester: { id: string; full_name: string; role: string } | null;
  approver: { id: string; full_name: string; role: string } | null;
  stage: {
    id: string; name: string; value: number; status: string;
    contracts: { project_id: string; projects: { name: string } }[];
  } | null;
};

type Wallet = {
  balance: number;
  available_amount: number;
  ringfenced_amount: number;
} | null;

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8", submitted: "#60a5fa", under_review: "#fbbf24",
  approved: "#34d399", pending_funding: "#f97316", rejected: "#f87171",
  active: "#a3e635", cancelled: "#6b7280",
};

const ACTIONS_FOR_STATUS: Record<string, { action: VariationAction; label: string; roles: AppRole[] }[]> = {
  submitted: [
    { action: "begin_review", label: "Begin review", roles: ["commercial", "admin"] },
    { action: "reject", label: "Reject", roles: ["commercial", "admin"] },
  ],
  under_review: [
    { action: "approve", label: "Approve variation", roles: ["commercial", "admin"] },
    { action: "reject", label: "Reject variation", roles: ["commercial", "admin"] },
  ],
  approved: [
    { action: "confirm_funding", label: "Confirm funding & activate", roles: ["funder", "admin"] },
    { action: "mark_pending", label: "Mark as pending funding", roles: ["funder", "developer", "admin"] },
  ],
  pending_funding: [
    { action: "retry_funding", label: "Confirm funding & activate", roles: ["funder", "admin"] },
  ],
  draft: [
    { action: "submit", label: "Submit for review", roles: ["contractor", "developer", "admin"] },
    { action: "cancel", label: "Cancel", roles: ["contractor", "developer", "admin"] },
  ],
};

const FUNDING_ACTIONS = new Set<VariationAction>(["confirm_funding", "retry_funding"]);

export default function VariationDetailPage() {
  const params = useParams<{ id: string; stageId: string; variationId: string }>();
  const { id: projectId, stageId, variationId } = params;

  const [variation, setVariation] = useState<Variation | null>(null);
  const [wallet, setWallet] = useState<Wallet>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fundingConfirmed, setFundingConfirmed] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) =>
      setUserRole(user ? getRole(user) as AppRole | null : null)
    );
    fetch(`/api/variations/${variationId}`)
      .then((r) => r.json())
      .then((d) => {
        setVariation(d.variation);
        setWallet(d.wallet ?? null);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load variation."); setLoading(false); });
  }, [variationId]);

  async function doAction(action: VariationAction) {
    setActionError(null);
    setActing(true);
    const res = await fetch(`/api/variations/${variationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActing(false);
    if (!res.ok) {
      setActionError(data.error ?? "Action failed.");
      // Reload to reflect auto-transitions (e.g. pending_funding / funding_gap)
      const r2 = await fetch(`/api/variations/${variationId}`);
      const d2 = await r2.json();
      setVariation(d2.variation);
      setWallet(d2.wallet ?? null);
      setFundingConfirmed(false);
      return;
    }
    setFundingConfirmed(false);
    const r2 = await fetch(`/api/variations/${variationId}`);
    const d2 = await r2.json();
    setVariation(d2.variation);
    setWallet(d2.wallet ?? null);
  }

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
        <p className="text-neutral-400">Loading…</p>
      </div>
    </AppShell>
  );
  if (error || !variation) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
        <p className="text-red-400">{error ?? "Not found"}</p>
      </div>
    </AppShell>
  );

  const statusColor = STATUS_COLORS[variation.status] ?? "#94a3b8";
  const availableActions = (ACTIONS_FOR_STATUS[variation.status] ?? []).filter(
    (a) => userRole && a.roles.includes(userRole),
  );

  const stage = Array.isArray(variation.stage) ? variation.stage[0] : variation.stage;
  const originalValue = Number(stage?.value ?? 0);
  const valueChange = Number(variation.value_change);
  const newStageValue = originalValue + valueChange;

  const walletAvailable = Number(wallet?.available_amount ?? 0);
  const shortfall = valueChange > 0 ? Math.max(0, valueChange - walletAvailable) : 0;
  const hasFundingShortfall = shortfall > 0;

  const showFinancialPanel = valueChange !== 0 && (
    variation.status === "approved" ||
    variation.status === "pending_funding" ||
    variation.status === "active"
  );

  return (
    <AppShell>
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link
        href={`/projects/${projectId}/stages/${stageId}`}
        className="text-xs font-medium text-neutral-400 hover:text-white"
      >
        ← Back to stage
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Variation</h1>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ backgroundColor: statusColor + "33", color: statusColor, border: `1px solid ${statusColor}55` }}
        >
          {variation.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-6 space-y-4 max-w-lg">
        {/* Description + metadata */}
        <div
          className="rounded-[20px] p-5 space-y-3"
          style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Description</p>
            <p className="mt-1 text-sm text-white">{variation.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Value change</p>
              <p className="mt-1 text-lg font-bold" style={{ color: valueChange >= 0 ? "#4ade80" : "#f87171" }}>
                {valueChange >= 0 ? "+" : ""}{gbp.format(valueChange)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Stage</p>
              <p className="mt-1 text-sm text-white">{stage?.name ?? "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Requested by</p>
              <p className="mt-1 text-sm text-white">{variation.requester?.full_name ?? "—"}</p>
            </div>
            {variation.approver && (
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Approved by</p>
                <p className="mt-1 text-sm text-white">{variation.approver.full_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial impact panel */}
        {showFinancialPanel && (
          <div
            className="rounded-[20px] p-5 space-y-4"
            style={{
              border: hasFundingShortfall
                ? "1px solid rgba(249,115,22,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              backgroundColor: hasFundingShortfall
                ? "rgba(249,115,22,0.05)"
                : "rgba(255,255,255,0.04)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Financial impact
            </p>

            {/* Stage value breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">Original</p>
                <p className="mt-1 text-sm font-bold text-white">{gbp.format(originalValue)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">Change</p>
                <p
                  className="mt-1 text-sm font-bold"
                  style={{ color: valueChange >= 0 ? "#4ade80" : "#f87171" }}
                >
                  {valueChange >= 0 ? "+" : ""}{gbp.format(valueChange)}
                </p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">New total</p>
                <p className="mt-1 text-sm font-bold text-white">{gbp.format(newStageValue)}</p>
              </div>
            </div>

            {/* Wallet status */}
            {wallet && valueChange > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Wallet available</span>
                  <span className="font-semibold text-white">{gbp.format(walletAvailable)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Variation needed</span>
                  <span className="font-semibold text-white">{gbp.format(valueChange)}</span>
                </div>
                {hasFundingShortfall ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}
                  >
                    <span>Shortfall</span>
                    <span>{gbp.format(shortfall)}</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: "rgba(52,211,153,0.1)", color: "#34d399" }}
                  >
                    <span>Wallet covers increase</span>
                    <span>✓</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Funding confirmation checkbox for funder actions */}
        {availableActions.some((a) => FUNDING_ACTIONS.has(a.action)) && !hasFundingShortfall && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fundingConfirmed}
              onChange={(e) => setFundingConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-emerald-400"
            />
            <span className="text-xs text-neutral-300 leading-relaxed">
              I confirm that the wallet has sufficient funds to cover this variation and authorise the stage value to be updated by {gbp.format(valueChange)}.
            </span>
          </label>
        )}

        {/* Actions */}
        {availableActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Actions</p>
            {availableActions.map((a) => {
              const needsConfirmation = FUNDING_ACTIONS.has(a.action) && valueChange > 0;
              const isDisabled = acting || (needsConfirmation && !fundingConfirmed);
              return (
                <button
                  key={a.action}
                  onClick={() => doAction(a.action)}
                  disabled={isDisabled}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {acting ? "Processing…" : a.label}
                </button>
              );
            })}
          </div>
        )}

        {actionError && (
          <p
            className="rounded-xl px-3 py-2 text-xs"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {actionError}
          </p>
        )}
      </div>
    </div>
    </AppShell>
  );
}
