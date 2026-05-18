"use client";

/**
 * Wallet page — /projects/[id]/wallet
 *
 * Sections:
 *  1. Balance summary (total / available / ring-fenced)
 *  2. Top-up form (funder / admin only) — inline
 *  3. Retention tracking — 5% withheld from each released stage
 *  4. Transaction history
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WalletTx = {
  id: string;
  type: string;
  amount: number;
  reference: string;
  created_at: string;
};

type Wallet = {
  id: string;
  balance: number;
  available_amount: number;
  ringfenced_amount: number;
};

type RetentionRow = {
  stageId: string;
  stageName: string;
  contractorName: string;
  certified: number;
  retention: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

const RETENTION_PCT = 0.05;

const TX_TYPE_COLOR: Record<string, string> = {
  deposit:           "#34d399",
  allocation_in:     "#60a5fa",
  allocation_out:    "#fbbf24",
  release:           "#f87171",
  reversal:          "#a78bfa",
  buffer_adjustment: "#94a3b8",
};

const TX_OUTBOUND = new Set(["release", "allocation_out"]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WalletPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [wallet, setWallet]               = useState<Wallet | null>(null);
  const [transactions, setTransactions]   = useState<WalletTx[]>([]);
  const [retention, setRetention]         = useState<RetentionRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [canDeposit, setCanDeposit]       = useState(false);

  // Top-up form
  const [showTopUp, setShowTopUp]         = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRef, setDepositRef]       = useState("");
  const [depositing, setDepositing]       = useState(false);
  const [depositError, setDepositError]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await createClient().auth.getUser();
        const role = user ? getRole(user) : null;
        setCanDeposit(role === "funder" || role === "admin");

        const [walletRes, txRes, dashRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/wallet`),
          fetch(`/api/projects/${projectId}/wallet/transactions`),
          fetch(`/api/projects/${projectId}/dashboard`),
        ]);
        const [walletData, txData, dashData] = await Promise.all([
          walletRes.json(), txRes.json(), dashRes.json(),
        ]);

        if (walletRes.ok) setWallet(walletData.wallet ?? null);
        else setError(walletData.error ?? "Failed to load wallet.");
        if (txRes.ok) setTransactions(txData.transactions ?? []);

        // Build retention rows from released stages in dashboard
        if (dashRes.ok) {
          const rows: RetentionRow[] = [];
          for (const c of dashData.contracts ?? []) {
            for (const s of c.stages ?? []) {
              if (s.status === "released") {
                const certified = s.certifiedAmount ?? s.value;
                rows.push({
                  stageId:       s.id,
                  stageName:     s.name,
                  contractorName: c.contractorName,
                  certified,
                  retention:     certified * RETENTION_PCT,
                });
              }
            }
          }
          setRetention(rows);
        }
      } catch {
        setError("Network error loading wallet.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepositError(null);
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { setDepositError("Enter a valid amount."); return; }
    if (!depositRef.trim()) { setDepositError("Reference is required."); return; }

    setDepositing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/wallet`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount, reference: depositRef.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setDepositError(data.error ?? "Deposit failed."); return; }

      setWallet(data.wallet);
      setTransactions((prev) => [{
        id: crypto.randomUUID(),
        type: "deposit",
        amount,
        reference: depositRef.trim(),
        created_at: new Date().toISOString(),
      }, ...prev]);
      setDepositAmount("");
      setDepositRef("");
      setShowTopUp(false);
    } catch {
      setDepositError("Network error — please try again.");
    } finally {
      setDepositing(false);
    }
  }

  const totalRetention = retention.reduce((s, r) => s + r.retention, 0);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
          <p className="text-sm text-neutral-500">Loading wallet…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Back to project
        </Link>

        <div className="mt-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          {canDeposit && (
            <button
              onClick={() => setShowTopUp((v) => !v)}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.35)" }}
            >
              {showTopUp ? "Cancel" : "+ Add funds"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="max-w-3xl space-y-6">

          {/* 1. Balance summary */}
          {wallet && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total balance",   value: wallet.balance,           color: "#e5e5e5" },
                { label: "Available",       value: wallet.available_amount,  color: "#34d399" },
                { label: "Ring-fenced",     value: wallet.ringfenced_amount, color: "#60a5fa" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-2xl px-4 py-4"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
                  <p className="mt-1.5 text-lg font-bold" style={{ color }}>{gbp.format(Number(value))}</p>
                </div>
              ))}
            </div>
          )}

          {/* 2. Top-up form */}
          {showTopUp && canDeposit && (
            <form
              onSubmit={handleDeposit}
              className="rounded-[20px] p-5 space-y-4"
              style={{ border: "1px solid rgba(52,211,153,0.25)", backgroundColor: "rgba(52,211,153,0.05)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400">Add funds to wallet</p>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Amount (£)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Payment reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Bank transfer 14 May"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>
              </div>

              {depositAmount && parseFloat(depositAmount) > 0 && (
                <p className="text-xs text-neutral-400">
                  Adding{" "}
                  <span className="font-semibold text-green-300">{gbp.format(parseFloat(depositAmount))}</span>
                  {" "}— available balance will become{" "}
                  <span className="font-semibold text-white">
                    {gbp.format(Number(wallet?.available_amount ?? 0) + parseFloat(depositAmount))}
                  </span>.
                </p>
              )}

              {depositError && <p className="text-xs text-red-400">{depositError}</p>}

              <button
                type="submit"
                disabled={depositing}
                className="w-full rounded-2xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "rgba(52,211,153,0.25)", border: "1px solid rgba(52,211,153,0.4)" }}
              >
                {depositing ? "Processing…" : "Confirm deposit"}
              </button>
            </form>
          )}

          {/* 3. Retention tracking */}
          {retention.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Retention held — {(RETENTION_PCT * 100).toFixed(0)}% withheld per released stage
              </p>
              <div
                className="rounded-[20px] overflow-hidden"
                style={{ border: "1px solid rgba(251,191,36,0.2)", backgroundColor: "rgba(251,191,36,0.04)" }}
              >
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500 border-b border-white/8">
                        <th className="px-5 py-3 font-medium">Stage</th>
                        <th className="px-5 py-3 font-medium">Contractor</th>
                        <th className="px-5 py-3 font-medium text-right">Certified payment</th>
                        <th className="px-5 py-3 font-medium text-right">Retention ({(RETENTION_PCT * 100).toFixed(0)}%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {retention.map((r) => (
                        <tr key={r.stageId} className="text-neutral-300">
                          <td className="px-5 py-3 font-medium text-white">{r.stageName}</td>
                          <td className="px-5 py-3 text-xs text-neutral-400">{r.contractorName}</td>
                          <td className="px-5 py-3 text-right">{gbp.format(r.certified)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-amber-300">{gbp.format(r.retention)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/10">
                      <tr className="font-bold">
                        <td className="px-5 py-3 text-white" colSpan={3}>Total retention withheld</td>
                        <td className="px-5 py-3 text-right text-amber-300 text-base">{gbp.format(totalRetention)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-white/5">
                  {retention.map((r) => (
                    <div key={r.stageId} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.stageName}</p>
                        <p className="text-xs text-neutral-500">{r.contractorName} · {gbp.format(r.certified)} certified</p>
                      </div>
                      <p className="ml-3 shrink-0 font-bold text-amber-300">{gbp.format(r.retention)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                    <p className="text-sm font-bold text-white">Total withheld</p>
                    <p className="font-bold text-amber-300 text-base">{gbp.format(totalRetention)}</p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                Retention is typically released at practical completion and expiry of the defects period.
              </p>
            </div>
          )}

          {/* 4. Transaction history */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Transaction history</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-neutral-500">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const color = TX_TYPE_COLOR[tx.type] ?? "#94a3b8";
                  const isOut = TX_OUTBOUND.has(tx.type);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl px-4 py-3"
                      style={{ border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{tx.reference}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                          {tx.type.replace(/_/g, " ")}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">{fmt.format(new Date(tx.created_at))}</p>
                      </div>
                      <p className="ml-4 shrink-0 text-sm font-bold" style={{ color }}>
                        {isOut ? "−" : "+"}{gbp.format(Math.abs(Number(tx.amount)))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
