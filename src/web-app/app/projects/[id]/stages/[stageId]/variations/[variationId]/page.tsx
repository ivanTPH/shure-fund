"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { VariationAction } from "@/lib/workflow/variationStateMachine";
import AppShell from "@/app/components/AppShell";

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

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:           { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
  submitted:       { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  under_review:    { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  approved:        { bg: "#f0fdf4", text: "#059669", border: "#a7f3d0" },
  pending_funding: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  rejected:        { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  active:          { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  cancelled:       { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
};

const ACTION_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  begin_review:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  approve:         { bg: "#f0fdf4", border: "#a7f3d0", text: "#059669" },
  confirm_funding: { bg: "#f0fdf4", border: "#a7f3d0", text: "#059669" },
  retry_funding:   { bg: "#f0fdf4", border: "#a7f3d0", text: "#059669" },
  mark_pending:    { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
  reject:          { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  cancel:          { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  submit:          { bg: "#0D1144", border: "#0D1144", text: "#ffffff" },
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>Loading…</p>
      </div>
    </AppShell>
  );
  if (error || !variation) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-500">{error ?? "Not found"}</p>
      </div>
    </AppShell>
  );

  const statusStyle = STATUS_COLORS[variation.status] ?? STATUS_COLORS.draft;
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
    <div className="min-h-screen px-4 py-8">
      <Link
        href={`/projects/${projectId}/stages/${stageId}`}
        className="text-xs font-medium hover:underline"
        style={{ color: "rgba(13,17,68,0.55)" }}
      >
        ← Back to stage
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Variation</h1>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
        >
          {variation.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-6 space-y-4 max-w-lg">
        {/* Description + metadata */}
        <div
          className="rounded-[20px] p-5 space-y-3"
          style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Description</p>
            <p className="mt-1 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{variation.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Value change</p>
              <p className="mt-1 text-lg font-bold" style={{ color: valueChange >= 0 ? "#059669" : "#dc2626" }}>
                {valueChange >= 0 ? "+" : ""}{gbp.format(valueChange)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Stage</p>
              <p className="mt-1 text-sm font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{stage?.name ?? "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Requested by</p>
              <p className="mt-1 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{variation.requester?.full_name ?? "—"}</p>
            </div>
            {variation.approver && (
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Approved by</p>
                <p className="mt-1 text-sm" style={{ color: "var(--brand-navy, #0D1144)" }}>{variation.approver.full_name}</p>
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
                ? "1px solid #fed7aa"
                : "1px solid var(--surface-border, #e4e7f0)",
              backgroundColor: hasFundingShortfall ? "#fff7ed" : "#fff",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Financial impact
            </p>

            {/* Stage value breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)" }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Original</p>
                <p className="mt-1 text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(originalValue)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)" }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Change</p>
                <p
                  className="mt-1 text-sm font-bold"
                  style={{ color: valueChange >= 0 ? "#059669" : "#dc2626" }}
                >
                  {valueChange >= 0 ? "+" : ""}{gbp.format(valueChange)}
                </p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)" }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>New total</p>
                <p className="mt-1 text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(newStageValue)}</p>
              </div>
            </div>

            {/* Wallet status */}
            {wallet && valueChange > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "rgba(13,17,68,0.55)" }}>Wallet available</span>
                  <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(walletAvailable)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "rgba(13,17,68,0.55)" }}>Variation needed</span>
                  <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>{gbp.format(valueChange)}</span>
                </div>
                {hasFundingShortfall ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }}
                  >
                    <span>Shortfall</span>
                    <span>{gbp.format(shortfall)}</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: "#f0fdf4", color: "#059669", border: "1px solid #a7f3d0" }}
                  >
                    <span>Wallet covers increase</span>
                    <span>✓</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Funding confirmation checkbox */}
        {availableActions.some((a) => FUNDING_ACTIONS.has(a.action)) && !hasFundingShortfall && (
          <label
            className="flex items-start gap-3 cursor-pointer rounded-2xl px-4 py-4"
            style={{
              border: `1px solid ${fundingConfirmed ? "#a7f3d0" : "var(--surface-border, #e4e7f0)"}`,
              backgroundColor: fundingConfirmed ? "#f0fdf4" : "#fff",
            }}
          >
            <input
              type="checkbox"
              checked={fundingConfirmed}
              onChange={(e) => setFundingConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
            />
            <span className="text-xs leading-relaxed" style={{ color: "rgba(13,17,68,0.7)" }}>
              I confirm the wallet has sufficient funds to cover this variation and authorise the stage value to be updated by {gbp.format(valueChange)}.
            </span>
          </label>
        )}

        {/* Actions */}
        {availableActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Actions</p>
            {availableActions.map((a) => {
              const needsConfirmation = FUNDING_ACTIONS.has(a.action) && valueChange > 0;
              const isDisabled = acting || (needsConfirmation && !fundingConfirmed);
              const style = ACTION_STYLE[a.action] ?? { bg: "#f7f8fc", border: "#e4e7f0", text: "#0D1144" };
              return (
                <button
                  key={a.action}
                  onClick={() => doAction(a.action)}
                  disabled={isDisabled}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-40"
                  style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}
                >
                  {acting ? "Processing…" : a.label}
                </button>
              );
            })}
          </div>
        )}

        {actionError && (
          <div
            className="rounded-xl px-3 py-2"
            style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            <p className="text-xs font-bold uppercase tracking-wider">Error</p>
            <p className="mt-0.5 text-xs">{actionError}</p>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
