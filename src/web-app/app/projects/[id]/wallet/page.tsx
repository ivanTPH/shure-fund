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
  released: boolean;
};

type TokenPayment = {
  id: string;
  amount: number;
  sharePct: number | null;
  reference: string;
  paidAt: string;
  stageName: string | null;
  userId: string;
};

type TokenHolder = {
  id: string;
  share_pct: number;
  label: string | null;
  user: { id: string; full_name: string; email: string; role: string } | null;
};

type PofDeclaration = {
  id: string;
  amount: number;
  bank_name: string | null;
  bank_reference: string | null;
  valid_from: string;
  valid_until: string;
  status: "active" | "expired" | "withdrawn";
  withdrawn_at: string | null;
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
  deposit:           "#059669",
  allocation_in:     "#2563eb",
  allocation_out:    "#d97706",
  release:           "#dc2626",
  reversal:          "#7c3aed",
  buffer_adjustment: "#64748b",
  retention_release: "#d97706",
};

const TX_TYPE_LABEL: Record<string, string> = {
  deposit:           "Funding received",
  allocation_in:     "Budget transfer in",
  allocation_out:    "Budget committed",
  release:           "Stage payment",
  reversal:          "Payment reversed",
  buffer_adjustment: "Buffer adjustment",
  retention_release: "Retention released",
};

const TX_OUTBOUND = new Set(["release", "allocation_out", "retention_release"]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WalletPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const [wallet, setWallet]               = useState<Wallet | null>(null);
  const [transactions, setTransactions]   = useState<WalletTx[]>([]);
  const [retention, setRetention]         = useState<RetentionRow[]>([]);
  const [tokenPayments, setTokenPayments] = useState<TokenPayment[]>([]);
  const [holders, setHolders]             = useState<TokenHolder[]>([]);
  const [holdersTotal, setHoldersTotal]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [canDeposit, setCanDeposit]               = useState(false);
  const [canManageHolders, setCanManageHolders]   = useState(false);
  const [canReleaseRetention, setCanReleaseRetention] = useState(false);
  const [releasingRetention, setReleasingRetention]   = useState<string | null>(null); // stageId

  // Proof-of-funds (Tier 2)
  const [pofDeclarations, setPofDeclarations]       = useState<PofDeclaration[]>([]);
  const [pofActiveTotal, setPofActiveTotal]         = useState(0);
  const [canManagePof, setCanManagePof]             = useState(false);
  const [showPofForm, setShowPofForm]               = useState(false);
  const [pofAmount, setPofAmount]                   = useState("");
  const [pofBankName, setPofBankName]               = useState("");
  const [pofBankRef, setPofBankRef]                 = useState("");
  const [pofValidFrom, setPofValidFrom]             = useState("");
  const [pofValidUntil, setPofValidUntil]           = useState("");
  const [submittingPof, setSubmittingPof]           = useState(false);
  const [pofError, setPofError]                     = useState<string | null>(null);
  const [withdrawingPof, setWithdrawingPof]         = useState<string | null>(null);

  // Add token holder form
  const [showAddHolder, setShowAddHolder]   = useState(false);
  const [newHolderEmail, setNewHolderEmail] = useState("");
  const [newHolderShare, setNewHolderShare] = useState("");
  const [newHolderLabel, setNewHolderLabel] = useState("");
  const [addingHolder, setAddingHolder]     = useState(false);
  const [addHolderError, setAddHolderError] = useState<string | null>(null);

  // Top-up form
  const [showTopUp, setShowTopUp]             = useState(false);
  const [depositAmount, setDepositAmount]     = useState("");
  const [depositRef, setDepositRef]           = useState("");
  const [depositing, setDepositing]           = useState(false);
  const [depositError, setDepositError]       = useState<string | null>(null);
  const [depositIdempotencyKey, setDepositIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await createClient().auth.getUser();
        const role = user ? getRole(user) : null;
        setCanDeposit(role === "funder" || role === "admin");
        setCanManageHolders(role === "admin" || role === "developer");
        setCanReleaseRetention(role === "admin" || role === "developer" || role === "funder");
        setCanManagePof(role === "funder" || role === "admin");

        const [walletRes, txRes, dashRes, tokenRes, holdersRes, pofRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/wallet`),
          fetch(`/api/projects/${projectId}/wallet/transactions`),
          fetch(`/api/projects/${projectId}/dashboard`),
          fetch(`/api/token-payments?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}/token-holders`),
          fetch(`/api/projects/${projectId}/proof-of-funds`),
        ]);
        const [walletData, txData, dashData, tokenData, holdersData, pofData] = await Promise.all([
          walletRes.json(), txRes.json(), dashRes.json(), tokenRes.json(),
          holdersRes.ok ? holdersRes.json() : { holders: [], totalSharePct: 0 },
          pofRes.ok ? pofRes.json() : { declarations: [], totalActive: 0 },
        ]);

        if (walletRes.ok) setWallet(walletData.wallet ?? null);
        else setError(walletData.error ?? "Failed to load wallet.");
        if (txRes.ok) setTransactions(txData.transactions ?? []);
        if (tokenRes.ok) setTokenPayments(tokenData.payments ?? []);
        setPofDeclarations(pofData.declarations ?? []);
        setPofActiveTotal(pofData.totalActive ?? 0);
        setHolders(holdersData.holders ?? []);
        setHoldersTotal(holdersData.totalSharePct ?? 0);

        // Build retention rows from released stages in dashboard
        if (dashRes.ok) {
          const rows: RetentionRow[] = [];
          for (const c of dashData.contracts ?? []) {
            for (const s of c.stages ?? []) {
              if (s.status === "released") {
                const certified = s.certifiedAmount ?? s.value;
                rows.push({
                  stageId:        s.id,
                  stageName:      s.name,
                  contractorName: c.contractorName,
                  certified,
                  retention:      certified * RETENTION_PCT,
                  released:       !!s.retentionReleasedAt,
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

  async function handleAddHolder(e: React.FormEvent) {
    e.preventDefault();
    setAddHolderError(null);
    const share = parseFloat(newHolderShare);
    if (isNaN(share) || share <= 0 || share > 100) { setAddHolderError("Share must be between 0 and 100."); return; }
    if (!newHolderEmail.trim()) { setAddHolderError("Email is required."); return; }

    setAddingHolder(true);
    try {
      // Resolve user by email via a search endpoint (use admin API)
      const lookupRes = await fetch(`/api/users?email=${encodeURIComponent(newHolderEmail.trim())}`);
      if (!lookupRes.ok) { setAddHolderError("User not found with that email."); return; }
      const { user: foundUser } = await lookupRes.json() as { user: { id: string } };

      const res = await fetch(`/api/projects/${projectId}/token-holders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: foundUser.id, sharePct: share, label: newHolderLabel.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setAddHolderError(data.error ?? "Failed to add holder."); return; }

      setHolders((prev) => [...prev, data.holder as TokenHolder]);
      setHoldersTotal((prev) => prev + share);
      setNewHolderEmail(""); setNewHolderShare(""); setNewHolderLabel("");
      setShowAddHolder(false);
    } catch {
      setAddHolderError("Network error — please try again.");
    } finally {
      setAddingHolder(false);
    }
  }

  async function handleRemoveHolder(holderId: string, sharePct: number) {
    const res = await fetch(`/api/projects/${projectId}/token-holders/${holderId}`, { method: "DELETE" });
    if (res.ok) {
      setHolders((prev) => prev.filter((h) => h.id !== holderId));
      setHoldersTotal((prev) => prev - sharePct);
    }
  }

  async function handleDeclarePof(e: React.FormEvent) {
    e.preventDefault();
    setPofError(null);
    const amount = parseFloat(pofAmount);
    if (isNaN(amount) || amount <= 0) { setPofError("Enter a valid amount."); return; }
    if (!pofValidFrom) { setPofError("Valid from date is required."); return; }
    if (!pofValidUntil) { setPofError("Valid until date is required."); return; }
    if (new Date(pofValidUntil) <= new Date(pofValidFrom)) {
      setPofError("Valid until must be after valid from."); return;
    }
    setSubmittingPof(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/proof-of-funds`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount,
          validFrom:     pofValidFrom,
          validUntil:    pofValidUntil,
          bankName:      pofBankName.trim() || undefined,
          bankReference: pofBankRef.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPofError((data as { error?: string }).error ?? "Failed to declare."); return; }
      setPofDeclarations((prev) => [data.declaration as PofDeclaration, ...prev]);
      setPofActiveTotal((prev) => prev + amount);
      setPofAmount(""); setPofBankName(""); setPofBankRef("");
      setPofValidFrom(""); setPofValidUntil("");
      setShowPofForm(false);
    } catch {
      setPofError("Network error — please try again.");
    } finally {
      setSubmittingPof(false);
    }
  }

  async function handleWithdrawPof(pofId: string, amount: number) {
    setWithdrawingPof(pofId);
    try {
      const res = await fetch(`/api/projects/${projectId}/proof-of-funds/${pofId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({}),
      });
      if (res.ok) {
        setPofDeclarations((prev) =>
          prev.map((p) => p.id === pofId ? { ...p, status: "withdrawn" as const, withdrawn_at: new Date().toISOString() } : p),
        );
        setPofActiveTotal((prev) => Math.max(0, prev - amount));
      }
    } finally {
      setWithdrawingPof(null);
    }
  }

  async function handleReleaseRetention(stageId: string) {
    setReleasingRetention(stageId);
    try {
      const res = await fetch(`/api/projects/${projectId}/retention/release`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stageId }),
      });
      if (res.ok) {
        setRetention((prev) =>
          prev.map((r) => r.stageId === stageId ? { ...r, released: true } : r),
        );
      }
    } finally {
      setReleasingRetention(null);
    }
  }

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
        body:    JSON.stringify({ amount, reference: depositRef.trim(), idempotencyKey: depositIdempotencyKey }),
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
      setDepositIdempotencyKey(crypto.randomUUID()); // rotate key for next deposit
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
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(13,17,68,0.4)" }}>Loading wallet…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8">
        <Link href={`/projects/${projectId}`} className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← Back to project
        </Link>

        <div className="mt-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Wallet</h1>
          {canDeposit && (
            <button
              onClick={() => setShowTopUp((v) => !v)}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#059669", border: "1px solid #059669" }}
            >
              {showTopUp ? "Cancel" : "+ Add funds"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="max-w-3xl space-y-6">

          {/* 1. Balance summary */}
          {wallet && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total balance",   value: wallet.balance,           color: "var(--brand-navy, #0D1144)" },
                { label: "Available",       value: wallet.available_amount,  color: "#059669" },
                { label: "Ring-fenced",     value: wallet.ringfenced_amount, color: "#2563eb" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-2xl px-4 py-4"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.45)" }}>{label}</p>
                  <p className="mt-1.5 text-lg font-bold" style={{ color }}>{gbp.format(Number(value))}</p>
                </div>
              ))}
            </div>
          )}

          {/* 1b. Trust tier coverage */}
          {(wallet || pofDeclarations.length > 0 || canManagePof) && (
            <div
              className="rounded-[20px] overflow-hidden"
              style={{ border: "1px solid rgba(37,99,235,0.2)", backgroundColor: "rgba(37,99,235,0.03)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(37,99,235,0.12)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2563eb" }}>
                  Trust coverage
                </p>
                {canManagePof && (
                  <button
                    onClick={() => setShowPofForm((v) => !v)}
                    className="text-xs font-semibold px-3 py-1 rounded-xl transition hover:opacity-80"
                    style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#2563eb" }}
                  >
                    {showPofForm ? "Cancel" : "+ Declare Tier 2"}
                  </button>
                )}
              </div>

              {/* Declare PoF form */}
              {showPofForm && canManagePof && (
                <form
                  onSubmit={handleDeclarePof}
                  className="px-5 py-4 space-y-3"
                  style={{ borderBottom: "1px solid rgba(37,99,235,0.12)" }}
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Amount (£)</label>
                      <input type="number" min="1" step="0.01" value={pofAmount} onChange={(e) => setPofAmount(e.target.value)} required placeholder="e.g. 100000" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Bank name (optional)</label>
                      <input type="text" value={pofBankName} onChange={(e) => setPofBankName(e.target.value)} placeholder="e.g. Barclays" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Bank reference (optional)</label>
                      <input type="text" value={pofBankRef} onChange={(e) => setPofBankRef(e.target.value)} placeholder="e.g. REF-20240614" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Valid from</label>
                      <input type="date" value={pofValidFrom} onChange={(e) => setPofValidFrom(e.target.value)} required className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Valid until</label>
                      <input type="date" value={pofValidUntil} onChange={(e) => setPofValidUntil(e.target.value)} required className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                  </div>
                  {pofError && <p className="text-xs text-red-500">{pofError}</p>}
                  <button type="submit" disabled={submittingPof} className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50 transition hover:opacity-90" style={{ backgroundColor: "#2563eb" }}>
                    {submittingPof ? "Declaring…" : "Declare proof of funds"}
                  </button>
                </form>
              )}

              {/* Tier summary rows */}
              <div className="divide-y" style={{ borderColor: "rgba(37,99,235,0.1)" }}>
                {/* Tier 1 */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>Tier 1 — Trust account</p>
                    <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Committed, locked — 30 days of work payments</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#2563eb" }}>{gbp.format(Number(wallet?.balance ?? 0))}</p>
                </div>

                {/* Tier 2 active declarations */}
                {pofDeclarations.filter((p) => p.status === "active").map((p) => {
                  const expiresIn = Math.ceil((new Date(p.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const nearExpiry = expiresIn <= 7;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          Tier 2 — Bank proof of funds
                          {p.bank_name && <span className="ml-2 text-xs font-normal" style={{ color: "rgba(13,17,68,0.45)" }}>{p.bank_name}</span>}
                        </p>
                        <p className="text-xs" style={{ color: nearExpiry ? "#d97706" : "rgba(13,17,68,0.45)" }}>
                          Uncommitted — valid until {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {nearExpiry && ` (${expiresIn}d left)`}
                          {p.bank_reference && ` · Ref: ${p.bank_reference}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <p className="text-sm font-bold" style={{ color: "#64748b" }}>{gbp.format(Number(p.amount))}</p>
                        {canManagePof && (
                          <button
                            onClick={() => handleWithdrawPof(p.id, Number(p.amount))}
                            disabled={withdrawingPof === p.id}
                            className="text-xs px-2 py-1 rounded-lg transition hover:opacity-70 disabled:opacity-50"
                            style={{ color: "#dc2626", backgroundColor: "rgba(220,38,38,0.07)" }}
                          >
                            {withdrawingPof === p.id ? "…" : "Withdraw"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* No Tier 2 */}
                {pofDeclarations.filter((p) => p.status === "active").length === 0 && (
                  <div className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>Tier 2 — Bank proof of funds</p>
                      <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>No active declarations — uncommitted bank buffer</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: "rgba(13,17,68,0.3)" }}>{gbp.format(0)}</p>
                  </div>
                )}

                {/* Total coverage */}
                <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "rgba(37,99,235,0.04)" }}>
                  <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Total coverage</p>
                  <p className="text-base font-bold" style={{ color: "#2563eb" }}>
                    {gbp.format(Number(wallet?.balance ?? 0) + pofActiveTotal)}
                  </p>
                </div>
              </div>

              {/* Expired / withdrawn history */}
              {pofDeclarations.filter((p) => p.status !== "active").length > 0 && (
                <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.4)" }}>Past declarations</p>
                  <div className="space-y-1.5">
                    {pofDeclarations.filter((p) => p.status !== "active").map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>
                          {p.status === "withdrawn" ? "Withdrawn" : "Expired"} · valid until {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {p.bank_name && ` · ${p.bank_name}`}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: "rgba(13,17,68,0.35)" }}>{gbp.format(Number(p.amount))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1c. Token holders */}
          {(holders.length > 0 || canManageHolders) && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                  Trust token holders — {holdersTotal.toFixed(2)}% allocated
                </p>
                {canManageHolders && (
                  <button
                    onClick={() => setShowAddHolder((v) => !v)}
                    className="text-xs font-semibold px-3 py-1 rounded-xl transition hover:opacity-80"
                    style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "var(--brand-navy, #0D1144)" }}
                  >
                    {showAddHolder ? "Cancel" : "+ Add holder"}
                  </button>
                )}
              </div>

              {showAddHolder && canManageHolders && (
                <form
                  onSubmit={handleAddHolder}
                  className="mb-3 rounded-[20px] p-4 space-y-3"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" }}
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>User email</label>
                      <input type="email" value={newHolderEmail} onChange={(e) => setNewHolderEmail(e.target.value)} required placeholder="holder@email.com" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Share %</label>
                      <input type="number" min="0.01" max="100" step="0.01" value={newHolderShare} onChange={(e) => setNewHolderShare(e.target.value)} required placeholder="e.g. 25" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Label (optional)</label>
                      <input type="text" value={newHolderLabel} onChange={(e) => setNewHolderLabel(e.target.value)} placeholder="e.g. Series A investor" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: "#f7f8fc", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }} />
                    </div>
                  </div>
                  {addHolderError && <p className="text-xs text-red-500">{addHolderError}</p>}
                  <button type="submit" disabled={addingHolder} className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}>
                    {addingHolder ? "Adding…" : "Add token holder"}
                  </button>
                </form>
              )}

              {holders.length > 0 ? (
                <div className="rounded-[20px] overflow-hidden" style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}>
                  {holders.map((h, i) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>
                          {h.user?.full_name ?? h.user?.email ?? "Unknown user"}
                          {h.label && <span className="ml-2 text-xs font-normal" style={{ color: "rgba(13,17,68,0.45)" }}>{h.label}</span>}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{h.user?.email} · {h.user?.role}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-bold" style={{ color: "#2563eb" }}>{Number(h.share_pct).toFixed(2)}%</span>
                        {canManageHolders && (
                          <button onClick={() => handleRemoveHolder(h.id, Number(h.share_pct))} className="text-xs px-2 py-1 rounded-lg transition hover:opacity-70" style={{ color: "#dc2626", backgroundColor: "rgba(220,38,38,0.07)" }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.02)" }}>
                    <p className="text-xs font-semibold" style={{ color: "rgba(13,17,68,0.45)" }}>Total allocated</p>
                    <p className="text-sm font-bold" style={{ color: holdersTotal >= 100 ? "#059669" : "#2563eb" }}>{holdersTotal.toFixed(2)}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No token holders registered yet.</p>
              )}
            </div>
          )}

          {/* 2. Top-up form */}
          {showTopUp && canDeposit && (
            <form
              onSubmit={handleDeposit}
              className="rounded-[20px] p-5 space-y-4"
              style={{ border: "1px solid rgba(5,150,105,0.2)", backgroundColor: "rgba(5,150,105,0.04)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#059669" }}>Add funds to wallet</p>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Amount (£)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(13,17,68,0.55)" }}>Payment reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Bank transfer 14 May"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ backgroundColor: "#fff", border: "1px solid var(--surface-border, #e4e7f0)", color: "var(--brand-navy, #0D1144)" }}
                  />
                </div>
              </div>

              {depositAmount && parseFloat(depositAmount) > 0 && (
                <p className="text-xs" style={{ color: "rgba(13,17,68,0.55)" }}>
                  Adding{" "}
                  <span className="font-semibold" style={{ color: "#059669" }}>{gbp.format(parseFloat(depositAmount))}</span>
                  {" "}— available balance will become{" "}
                  <span className="font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                    {gbp.format(Number(wallet?.available_amount ?? 0) + parseFloat(depositAmount))}
                  </span>.
                </p>
              )}

              {depositError && <p className="text-xs text-red-400">{depositError}</p>}

              <button
                type="submit"
                disabled={depositing}
                className="w-full rounded-2xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "#059669", border: "1px solid #059669" }}
              >
                {depositing ? "Processing…" : "Confirm deposit"}
              </button>
            </form>
          )}

          {/* 3. Retention tracking */}
          {retention.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
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
                      <tr className="text-left text-xs" style={{ color: "rgba(13,17,68,0.45)", borderBottom: "1px solid var(--surface-border, #e4e7f0)" }}>
                        <th className="px-5 py-3 font-medium">Stage</th>
                        <th className="px-5 py-3 font-medium">Contractor</th>
                        <th className="px-5 py-3 font-medium text-right">Certified payment</th>
                        <th className="px-5 py-3 font-medium text-right">Retention ({(RETENTION_PCT * 100).toFixed(0)}%)</th>
                        {canReleaseRetention && <th className="px-5 py-3 font-medium"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {retention.map((r) => (
                        <tr key={r.stageId} style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.7)" }}>
                          <td className="px-5 py-3 font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{r.stageName}</td>
                          <td className="px-5 py-3 text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{r.contractorName}</td>
                          <td className="px-5 py-3 text-right">{gbp.format(r.certified)}</td>
                          <td className="px-5 py-3 text-right font-semibold" style={{ color: r.released ? "#16a34a" : "#d97706" }}>
                            {r.released ? <span className="text-xs font-bold" style={{ color: "#16a34a" }}>Released</span> : gbp.format(r.retention)}
                          </td>
                          {canReleaseRetention && (
                            <td className="px-5 py-3 text-right">
                              {!r.released && (
                                <button
                                  onClick={() => handleReleaseRetention(r.stageId)}
                                  disabled={releasingRetention === r.stageId}
                                  className="text-xs font-semibold px-3 py-1 rounded-xl transition hover:opacity-80 disabled:opacity-50"
                                  style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}
                                >
                                  {releasingRetention === r.stageId ? "Releasing…" : "Release"}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                      <tr className="font-bold">
                        <td className="px-5 py-3" style={{ color: "var(--brand-navy, #0D1144)" }} colSpan={3}>Total retention withheld</td>
                        <td className="px-5 py-3 text-right text-base" style={{ color: "#d97706" }}>{gbp.format(totalRetention)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {retention.map((r) => (
                    <div key={r.stageId} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{r.stageName}</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.5)" }}>{r.contractorName} · {gbp.format(r.certified)} certified</p>
                      </div>
                      <div className="ml-3 shrink-0 flex items-center gap-2">
                        {r.released ? (
                          <span className="text-xs font-bold" style={{ color: "#16a34a" }}>Released</span>
                        ) : (
                          <>
                            <p className="font-bold" style={{ color: "#d97706" }}>{gbp.format(r.retention)}</p>
                            {canReleaseRetention && (
                              <button
                                onClick={() => handleReleaseRetention(r.stageId)}
                                disabled={releasingRetention === r.stageId}
                                className="text-xs font-semibold px-2 py-1 rounded-xl transition hover:opacity-80 disabled:opacity-50"
                                style={{ backgroundColor: "rgba(5,150,105,0.1)", color: "#059669" }}
                              >
                                {releasingRetention === r.stageId ? "…" : "Release"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Total withheld</p>
                    <p className="font-bold text-base" style={{ color: "#d97706" }}>{gbp.format(totalRetention)}</p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                Retention is typically released at practical completion and expiry of the defects period.
              </p>
            </div>
          )}

          {/* 4. Token distributions — per-stage payouts to token holders */}
          {tokenPayments.length > 0 && (() => {
            // Group by stage (paid_at batch)
            const byStage = new Map<string, { stageName: string | null; paidAt: string; rows: TokenPayment[] }>();
            for (const p of tokenPayments) {
              const key = `${p.stageName ?? p.paidAt}`;
              if (!byStage.has(key)) byStage.set(key, { stageName: p.stageName, paidAt: p.paidAt, rows: [] });
              byStage.get(key)!.rows.push(p);
            }
            const batches = [...byStage.values()].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
            const totalDistributed = tokenPayments.reduce((s, p) => s + p.amount, 0);

            return (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Token distributions</p>
                <div
                  className="rounded-[20px] overflow-hidden"
                  style={{ border: "1px solid rgba(5,150,105,0.2)", backgroundColor: "rgba(5,150,105,0.03)" }}
                >
                  {batches.map((batch, bi) => (
                    <div key={batch.paidAt + bi} style={{ borderTop: bi > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                      <div className="flex items-center justify-between px-5 py-2.5" style={{ backgroundColor: "rgba(5,150,105,0.05)" }}>
                        <p className="text-xs font-bold" style={{ color: "#059669" }}>{batch.stageName ?? "Stage release"}</p>
                        <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                          {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(batch.paidAt))}
                        </p>
                      </div>
                      {batch.rows.map((r, i) => (
                        <div key={r.id} className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}>
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--brand-navy, #0D1144)" }}>{r.reference}</p>
                            {r.sharePct != null && (
                              <p className="text-[10px]" style={{ color: "rgba(13,17,68,0.4)" }}>
                                {(r.sharePct * 100).toFixed(1)}% share
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold" style={{ color: "#059669" }}>{gbp.format(r.amount)}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Total distributed to token holders</p>
                    <p className="text-base font-bold" style={{ color: "#059669" }}>{gbp.format(totalDistributed)}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5. Transaction history — bank statement format */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>Transaction history</p>
              {transactions.length > 0 && (
                <a
                  href={`/api/projects/${projectId}/wallet/transactions?format=csv`}
                  download
                  className="text-xs font-semibold px-3 py-1 rounded-xl transition hover:opacity-80"
                  style={{ backgroundColor: "rgba(13,17,68,0.06)", color: "var(--brand-navy, #0D1144)" }}
                >
                  Export CSV
                </a>
              )}
            </div>
            {transactions.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(13,17,68,0.45)" }}>No transactions yet.</p>
            ) : (
              <div
                className="rounded-[20px] overflow-hidden"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)" }}
              >
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-[10px] font-semibold uppercase tracking-widest"
                        style={{ borderBottom: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "rgba(13,17,68,0.03)", color: "rgba(13,17,68,0.45)" }}
                      >
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3 text-right" style={{ color: "#dc2626" }}>Money out</th>
                        <th className="px-5 py-3 text-right" style={{ color: "#059669" }}>Money in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, i) => {
                        const isOut = TX_OUTBOUND.has(tx.type);
                        const amt = Math.abs(Number(tx.amount));
                        return (
                          <tr
                            key={tx.id}
                            style={{ borderTop: i > 0 ? "1px solid var(--surface-border, #e4e7f0)" : undefined }}
                          >
                            <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: "rgba(13,17,68,0.5)" }}>{fmt.format(new Date(tx.created_at))}</td>
                            <td className="px-5 py-3 font-medium max-w-xs truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{tx.reference}</td>
                            <td className="px-5 py-3">
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                style={{ backgroundColor: (TX_TYPE_COLOR[tx.type] ?? "#94a3b8") + "18", color: TX_TYPE_COLOR[tx.type] ?? "#94a3b8" }}
                              >
                                {TX_TYPE_LABEL[tx.type] ?? tx.type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-bold" style={{ color: isOut ? "#dc2626" : "rgba(13,17,68,0.2)" }}>
                              {isOut ? gbp.format(amt) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right font-bold" style={{ color: !isOut ? "#059669" : "rgba(13,17,68,0.2)" }}>
                              {!isOut ? gbp.format(amt) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile — stacked with debit/credit side-by-side */}
                <div className="md:hidden divide-y" style={{ borderColor: "var(--surface-border, #e4e7f0)" }}>
                  {transactions.map((tx) => {
                    const isOut = TX_OUTBOUND.has(tx.type);
                    const amt = Math.abs(Number(tx.amount));
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--brand-navy, #0D1144)" }}>{tx.reference}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: TX_TYPE_COLOR[tx.type] ?? "#6b7280" }}>
                            {TX_TYPE_LABEL[tx.type] ?? tx.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(13,17,68,0.45)" }}>{fmt.format(new Date(tx.created_at))}</p>
                        </div>
                        <div className="ml-4 text-right shrink-0">
                          {isOut ? (
                            <>
                              <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>out</p>
                              <p className="text-sm font-bold" style={{ color: "#dc2626" }}>−{gbp.format(amt)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>in</p>
                              <p className="text-sm font-bold" style={{ color: "#059669" }}>+{gbp.format(amt)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
