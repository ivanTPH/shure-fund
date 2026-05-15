"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { VariationAction } from "@/lib/workflow/variationStateMachine";

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

export default function VariationDetailPage() {
  const params = useParams<{ id: string; stageId: string; variationId: string }>();
  const { id: projectId, stageId, variationId } = params;

  const [variation, setVariation] = useState<Variation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserRole(user ? getRole(user) as AppRole | null : null));
    fetch(`/api/variations/${variationId}`)
      .then((r) => r.json())
      .then((d) => { setVariation(d.variation); setLoading(false); })
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
    if (!res.ok) { setActionError(data.error ?? "Action failed."); return; }
    // Reload
    const r2 = await fetch(`/api/variations/${variationId}`);
    const d2 = await r2.json();
    setVariation(d2.variation);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}><p className="text-neutral-400">Loading…</p></div>;
  if (error || !variation) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}><p className="text-red-400">{error ?? "Not found"}</p></div>;

  const statusColor = STATUS_COLORS[variation.status] ?? "#94a3b8";
  const availableActions = (ACTIONS_FOR_STATUS[variation.status] ?? []).filter(
    (a) => userRole && a.roles.includes(userRole),
  );
  const stage = Array.isArray(variation.stage) ? variation.stage[0] : variation.stage;
  const contract = Array.isArray(stage?.contracts) ? stage.contracts[0] : stage?.contracts;
  const newStageValue = (stage?.value ?? 0) + variation.value_change;

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Variation</h1>
        <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: statusColor + "33", color: statusColor, border: `1px solid ${statusColor}55` }}>
          {variation.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-6 space-y-4 max-w-lg">
        {/* Details */}
        <div className="rounded-[20px] p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Description</p>
            <p className="mt-1 text-sm text-white">{variation.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Value change</p>
              <p className="mt-1 text-lg font-bold" style={{ color: variation.value_change >= 0 ? "#4ade80" : "#f87171" }}>
                {variation.value_change >= 0 ? "+" : ""}{gbp.format(variation.value_change)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">New stage value</p>
              <p className="mt-1 text-lg font-bold text-white">{gbp.format(newStageValue)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Requested by</p>
              <p className="mt-1 text-sm text-white">{variation.requester?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Stage</p>
              <p className="mt-1 text-sm text-white">{stage?.name ?? "—"}</p>
            </div>
          </div>
          {variation.approver && (
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Approved by</p>
              <p className="mt-1 text-sm text-white">{variation.approver.full_name}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {availableActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Actions</p>
            {availableActions.map((a) => (
              <button
                key={a.action}
                onClick={() => doAction(a.action)}
                disabled={acting}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {acting ? "Processing…" : a.label}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {actionError}
          </p>
        )}
      </div>
    </div>
  );
}
