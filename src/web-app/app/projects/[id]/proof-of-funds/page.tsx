"use client";

/**
 * Proof of Funds — /projects/[id]/proof-of-funds
 *
 * Tier 2 bank proof-of-funds declarations for a project.
 * Read:  funder, developer, admin
 * Write: funder, admin
 *
 * Displays:
 *  - Total active coverage summary
 *  - Active declarations with validity period and bank details
 *  - Declare new PoF inline form
 *  - Withdrawn / expired history
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { useToast } from "@/app/components/ToastContext";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Declarer = { id: string; full_name: string; email: string } | null;

type Declaration = {
  id: string;
  amount: number;
  bank_name: string | null;
  bank_reference: string | null;
  valid_from: string;  // ISO date YYYY-MM-DD
  valid_until: string;
  status: "active" | "expired" | "withdrawn";
  withdrawn_at: string | null;
  withdrawal_reason: string | null;
  created_at: string;
  declarer: Declarer;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<Declaration["status"], { label: string; bg: string; color: string }> = {
  active:    { label: "Active",    bg: "rgba(5,150,105,0.09)",  color: "#059669" },
  expired:   { label: "Expired",   bg: "rgba(100,116,139,0.1)", color: "#64748b" },
  withdrawn: { label: "Withdrawn", bg: "rgba(220,38,38,0.09)",  color: "#dc2626" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: Declaration["status"] }) {
  const s = STATUS_STYLES[status];
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
// Main page
// ---------------------------------------------------------------------------

export default function ProofOfFundsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<AppRole | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [active, setActive] = useState<Declaration[]>([]);
  const [history, setHistory] = useState<Declaration[]>([]);
  const [totalActive, setTotalActive] = useState(0);

  // New declaration form state
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [validFrom, setValidFrom] = useState(today());
  const [validUntil, setValidUntil] = useState(addDays(today(), 30));
  const [bankName, setBankName] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Withdraw state
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/proof-of-funds`);
    if (res.status === 403 || res.status === 401) { router.replace("/projects"); return; }
    const data = await res.json() as {
      declarations: Declaration[];
      active: Declaration[];
      history: Declaration[];
      totalActive: number;
    };
    setDeclarations(data.declarations ?? []);
    setActive(data.active ?? []);
    setHistory(data.history ?? []);
    setTotalActive(Number(data.totalActive ?? 0));
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }
      const r = getRole(user) as AppRole;
      setRole(r);
      setCanWrite(r === "admin" || r === "funder");
      if (!["admin", "developer", "funder"].includes(r)) {
        router.replace("/projects");
        return;
      }
      await load();
    };
    init();
  }, [load, router]);

  async function submitDeclaration(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/proof-of-funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          validFrom,
          validUntil,
          bankName: bankName.trim() || undefined,
          bankReference: bankReference.trim() || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setFormError(data.error ?? "Failed to declare."); return; }
      toast("Proof of Funds declared", "success");
      setShowForm(false);
      setAmount("");
      setValidFrom(today());
      setValidUntil(addDays(today(), 30));
      setBankName("");
      setBankReference("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function doWithdraw() {
    if (!withdrawingId) return;
    setWithdrawError(null);
    setWithdrawing(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/proof-of-funds/${withdrawingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ withdrawalReason: withdrawReason.trim() || undefined }),
        },
      );
      const data = await res.json() as { error?: string; amlFlagged?: boolean };
      if (!res.ok) { setWithdrawError(data.error ?? "Withdrawal failed."); return; }
      setWithdrawingId(null);
      setWithdrawReason("");
      await load();
      if (data.amlFlagged) {
        toast("Withdrawal recorded — an AML compliance flag has been raised for review", "info");
      } else {
        toast("Proof of Funds withdrawn", "info");
      }
    } finally {
      setWithdrawing(false);
    }
  }

  const inputClass = "w-full rounded-[14px] px-3 py-2.5 text-sm outline-none";
  const inputStyle = {
    border: "1px solid var(--surface-border, #e4e7f0)",
    backgroundColor: "#fff",
    color: "#0D1144",
  };
  const labelClass = "block text-xs font-semibold mb-1";
  const labelStyle = { color: "rgba(13,17,68,0.6)" };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
          <Skeleton.CardList rows={3} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

        {/* Back nav */}
        <Link
          href={`/projects/${projectId}`}
          className="text-[11px] font-medium uppercase tracking-[0.14em] hover:underline"
          style={{ color: "rgba(13,17,68,0.45)" }}
        >
          ← Back to project
        </Link>

        {/* Page title */}
        <div className="mt-2 mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0D1144" }}>
            Proof of Funds
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.55)" }}>
            Tier 2 bank proof-of-funds — uncommitted funds held as assurance for the next 30 days of payments.
          </p>
        </div>

        {/* Total coverage card */}
        <div
          className="mb-6 rounded-[20px] px-5 py-5"
          style={{
            border: "1px solid var(--surface-border, #e4e7f0)",
            backgroundColor: active.length > 0 ? "rgba(5,150,105,0.04)" : "#fff",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
            Total active coverage
          </p>
          <p className="mt-1 text-3xl font-bold" style={{ color: active.length > 0 ? "#059669" : "#dc2626" }}>
            {gbp.format(totalActive)}
          </p>
          {active.length === 0 && (
            <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>
              No active proof of funds — Tier 2 coverage is zero.
            </p>
          )}
          {active.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
              {active.length} active declaration{active.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Active declarations */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Active declarations
            </h2>
            {canWrite && (
              <button
                type="button"
                onClick={() => { setShowForm((v) => !v); setFormError(null); }}
                className="rounded-[14px] px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                style={{ backgroundColor: "#0D1144", color: "#fff" }}
              >
                {showForm ? "Cancel" : "+ Declare funds"}
              </button>
            )}
          </div>

          {/* New declaration form */}
          {showForm && (
            <form
              onSubmit={submitDeclaration}
              className="mb-4 rounded-[20px] px-5 py-5"
              style={{ border: "1px solid rgba(37,99,235,0.25)", backgroundColor: "rgba(37,99,235,0.03)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>
                New declaration
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className={labelClass} style={labelStyle}>Amount (£)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 250000"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Valid from</label>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => { setValidFrom(e.target.value); }}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Valid until</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Bank name (optional)</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Barclays"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Bank reference (optional)</label>
                  <input
                    type="text"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="e.g. ACC-12345"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              {formError && <p className="mb-3 text-xs" style={{ color: "#dc2626" }}>{formError}</p>}
              <button
                type="submit"
                disabled={submitting || !amount || !validFrom || !validUntil}
                className="rounded-[14px] px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{ backgroundColor: "#0D1144", color: "#fff", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Saving…" : "Submit declaration"}
              </button>
            </form>
          )}

          {active.length === 0 && !showForm && (
            <div
              className="rounded-[18px] px-5 py-8 text-center"
              style={{ border: "1px dashed var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
            >
              <p className="text-sm font-medium" style={{ color: "rgba(13,17,68,0.6)" }}>No active declarations.</p>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
                {canWrite
                  ? "Declare your Tier 2 bank proof-of-funds to show 30-day coverage."
                  : "Tier 2 proof-of-funds declarations will appear here once submitted."}
              </p>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => { setShowForm(true); }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: "var(--brand-navy, #0D1144)", color: "#fff" }}
                >
                  Declare funds
                </button>
              )}
            </div>
          )}

          {active.map((dec) => (
            <DeclarationCard
              key={dec.id}
              dec={dec}
              canWithdraw={canWrite}
              withdrawingId={withdrawingId}
              withdrawReason={withdrawReason}
              withdrawError={withdrawError}
              withdrawing={withdrawing}
              onStartWithdraw={(id) => { setWithdrawingId(id); setWithdrawReason(""); setWithdrawError(null); }}
              onCancelWithdraw={() => setWithdrawingId(null)}
              onWithdrawReasonChange={setWithdrawReason}
              onConfirmWithdraw={doWithdraw}
            />
          ))}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(13,17,68,0.45)" }}>
              History
            </h2>
            {history.map((dec) => (
              <DeclarationCard
                key={dec.id}
                dec={dec}
                canWithdraw={false}
                withdrawingId={null}
                withdrawReason=""
                withdrawError={null}
                withdrawing={false}
                onStartWithdraw={() => {}}
                onCancelWithdraw={() => {}}
                onWithdrawReasonChange={() => {}}
                onConfirmWithdraw={async () => {}}
              />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// DeclarationCard
// ---------------------------------------------------------------------------

function DeclarationCard({
  dec,
  canWithdraw,
  withdrawingId,
  withdrawReason,
  withdrawError,
  withdrawing,
  onStartWithdraw,
  onCancelWithdraw,
  onWithdrawReasonChange,
  onConfirmWithdraw,
}: {
  dec: Declaration;
  canWithdraw: boolean;
  withdrawingId: string | null;
  withdrawReason: string;
  withdrawError: string | null;
  withdrawing: boolean;
  onStartWithdraw: (id: string) => void;
  onCancelWithdraw: () => void;
  onWithdrawReasonChange: (v: string) => void;
  onConfirmWithdraw: () => Promise<void>;
}) {
  const isWithdrawing = withdrawingId === dec.id;
  return (
    <div
      className="mb-3 rounded-[20px] px-5 py-4"
      style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold" style={{ color: "#0D1144" }}>
            {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(dec.amount))}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
            {fmtDate(dec.valid_from)} → {fmtDate(dec.valid_until)}
          </p>
          {dec.bank_name && (
            <p className="mt-1 text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
              {dec.bank_name}{dec.bank_reference ? ` · ${dec.bank_reference}` : ""}
            </p>
          )}
          {dec.declarer?.full_name && (
            <p className="mt-1 text-[11px]" style={{ color: "rgba(13,17,68,0.4)" }}>
              Declared by {dec.declarer.full_name}
            </p>
          )}
          {dec.withdrawn_at && (
            <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>
              Withdrawn {fmtDate(dec.withdrawn_at.slice(0, 10))}
              {dec.withdrawal_reason ? `: "${dec.withdrawal_reason}"` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={dec.status} />
          {canWithdraw && dec.status === "active" && !isWithdrawing && (
            <button
              type="button"
              onClick={() => onStartWithdraw(dec.id)}
              className="text-xs font-medium hover:underline"
              style={{ color: "#dc2626" }}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Withdrawal confirm panel */}
      {isWithdrawing && (
        <div
          className="mt-4 rounded-[14px] px-4 py-4"
          style={{ border: "1px solid rgba(220,38,38,0.25)", backgroundColor: "rgba(220,38,38,0.04)" }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "#dc2626" }}>
            Confirm early withdrawal — this may trigger an AML review.
          </p>
          <textarea
            value={withdrawReason}
            onChange={(e) => onWithdrawReasonChange(e.target.value)}
            placeholder="Reason for withdrawal (optional)"
            rows={2}
            className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none mb-3"
            style={{ border: "1px solid rgba(220,38,38,0.3)", backgroundColor: "#fff", color: "#0D1144" }}
          />
          {withdrawError && <p className="mb-2 text-xs" style={{ color: "#dc2626" }}>{withdrawError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmWithdraw}
              disabled={withdrawing}
              className="rounded-[12px] px-4 py-2 text-xs font-semibold transition hover:opacity-80"
              style={{ backgroundColor: "#dc2626", color: "#fff", opacity: withdrawing ? 0.6 : 1 }}
            >
              {withdrawing ? "Withdrawing…" : "Confirm withdrawal"}
            </button>
            <button
              type="button"
              onClick={onCancelWithdraw}
              className="rounded-[12px] px-4 py-2 text-xs font-medium"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.6)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
