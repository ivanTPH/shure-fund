"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const STATUS_COLOR: Record<string, string> = {
  raised: "#fbbf24", under_review: "#60a5fa", resolved: "#34d399", escalated: "#f97316",
};

const ACTIONS: { action: string; label: string; roles: string[] }[] = [
  { action: "respond",  label: "Begin review",  roles: ["commercial", "developer", "admin"] },
  { action: "resolve",  label: "Mark resolved", roles: ["commercial", "developer", "admin"] },
  { action: "escalate", label: "Escalate",       roles: ["developer", "admin"] },
];

type Dispute = {
  id: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  evidence_url: string | null;
  created_at: string;
  raiser: { id: string; full_name: string; role: string } | null;
  respondent: { id: string; full_name: string; role: string } | null;
  stage: {
    id: string; name: string;
    contracts: { project_id: string; projects: { name: string } }[];
  } | null;
};

export default function DisputeDetailPage() {
  const { id: projectId, stageId, disputeId } = useParams<{ id: string; stageId: string; disputeId: string }>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserRole(user ? getRole(user) as AppRole | null : null));
    load();
  }, [disputeId]);

  async function load() {
    try {
      const r = await fetch(`/api/disputes/${disputeId}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Not found"); return; }
      setDispute(d.dispute);
    } catch { setError("Failed to load dispute."); } finally { setLoading(false); }
  }

  async function doAction(action: string) {
    setActionError(null);
    setActing(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Action failed."); return; }
      await load();
      setNotes("");
    } finally { setActing(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}><p className="text-neutral-400">Loading…</p></div>;
  if (error || !dispute) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}><p className="text-red-400">{error ?? "Not found"}</p></div>;

  const statusColor = STATUS_COLOR[dispute.status] ?? "#94a3b8";
  const stage = Array.isArray(dispute.stage) ? dispute.stage[0] : dispute.stage;
  const availableActions = ACTIONS.filter((a) => userRole && a.roles.includes(userRole));
  const isTerminal = dispute.status === "resolved" || dispute.status === "escalated";

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Dispute</h1>
        <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}44` }}>
          {dispute.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-6 max-w-lg space-y-4">
        <div className="rounded-[20px] p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Reason</p>
            <p className="mt-1 text-sm text-white leading-relaxed">{dispute.reason}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Raised by</p>
              <p className="mt-1 text-sm text-white">{dispute.raiser?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Stage</p>
              <p className="mt-1 text-sm text-white">{stage?.name ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Raised</p>
            <p className="mt-1 text-sm text-white">{fmt.format(new Date(dispute.created_at))}</p>
          </div>
          {dispute.evidence_url && (
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Evidence</p>
              <a href={dispute.evidence_url} target="_blank" rel="noreferrer" className="mt-1 text-sm text-blue-400 hover:text-blue-300">
                View evidence
              </a>
            </div>
          )}
          {dispute.respondent && (
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Respondent</p>
              <p className="mt-1 text-sm text-white">{dispute.respondent.full_name}</p>
            </div>
          )}
          {dispute.resolution_notes && (
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Resolution notes</p>
              <p className="mt-1 text-sm text-white leading-relaxed">{dispute.resolution_notes}</p>
            </div>
          )}
        </div>

        {!isTerminal && availableActions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Actions</p>
            <textarea
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              rows={3}
              placeholder="Add resolution notes or response… (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {availableActions.map((a) => (
                <button
                  key={a.action}
                  onClick={() => doAction(a.action)}
                  disabled={acting}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {acting ? "Processing…" : a.label}
                </button>
              ))}
            </div>
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
