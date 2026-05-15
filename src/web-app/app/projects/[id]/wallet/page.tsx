"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

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

export default function WalletPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, txRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/wallet`),
          fetch(`/api/projects/${projectId}/wallet/transactions`),
        ]);
        const [walletData, txData] = await Promise.all([walletRes.json(), txRes.json()]);
        if (walletRes.ok) setWallet(walletData.wallet ?? null);
        if (txRes.ok) setTransactions(txData.transactions ?? []);
        if (!walletRes.ok) setError(walletData.error ?? "Failed to load wallet");
      } catch { setError("Network error"); } finally { setLoading(false); }
    }
    load();
  }, [projectId]);

  const TX_COLOR: Record<string, string> = {
    deposit: "#34d399",
    allocation_in: "#60a5fa",
    allocation_out: "#fbbf24",
    release: "#f87171",
    reversal: "#a78bfa",
    buffer_adjustment: "#94a3b8",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0d1144" }}>
      <p className="text-neutral-400">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to project
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">Wallet</h1>

      {error && (
        <p className="mt-4 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}

      {wallet && (
        <div className="mt-6 max-w-lg space-y-4">
          {/* Balances */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total balance", value: wallet.balance, color: "#94a3b8" },
              { label: "Available", value: wallet.available_amount, color: "#34d399" },
              { label: "Ring-fenced", value: wallet.ringfenced_amount, color: "#fbbf24" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
                <p className="mt-1 text-base font-bold" style={{ color }}>{gbp.format(Number(value))}</p>
              </div>
            ))}
          </div>

          {/* Transactions */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Transaction history</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-neutral-500">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const color = TX_COLOR[tx.type] ?? "#94a3b8";
                  const isOut = tx.type === "release" || tx.type === "allocation_out";
                  return (
                    <div key={tx.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{tx.reference}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{tx.type.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{fmt.format(new Date(tx.created_at))}</p>
                      </div>
                      <p className="ml-3 shrink-0 text-sm font-bold" style={{ color }}>
                        {isOut ? "−" : "+"}{gbp.format(Math.abs(Number(tx.amount)))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
