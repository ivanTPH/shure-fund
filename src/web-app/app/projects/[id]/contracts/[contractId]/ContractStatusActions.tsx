"use client";

/**
 * ContractStatusActions — interactive contract lifecycle transition buttons.
 *
 * Renders inline action buttons for the current contract status.
 * The server component passes status + role; this client component fires
 * the PATCH request and refreshes the page on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

type ContractStatus = "draft" | "issued" | "accepted" | "active" | "completed" | "cancelled";

const TRANSITIONS: Record<ContractStatus, Array<{
  to: ContractStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  allowedRoles: string[];
}>> = {
  draft: [
    { to: "issued", label: "Issue to contractor", color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.25)", allowedRoles: ["admin", "developer"] },
  ],
  issued: [
    { to: "accepted",  label: "Accept contract",  color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)", allowedRoles: ["admin", "contractor"] },
    { to: "cancelled", label: "Cancel contract",  color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)",  allowedRoles: ["admin", "developer"] },
  ],
  accepted: [
    { to: "active",    label: "Activate — begin work", color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)", allowedRoles: ["admin", "developer"] },
    { to: "cancelled", label: "Cancel",                color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)",  allowedRoles: ["admin", "developer"] },
  ],
  active: [
    { to: "completed", label: "Mark complete",  color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.2)",  allowedRoles: ["admin", "developer"] },
    { to: "cancelled", label: "Cancel",         color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)", allowedRoles: ["admin", "developer"] },
  ],
  completed: [],
  cancelled: [],
};

type Props = {
  projectId: string;
  contractId: string;
  status: ContractStatus;
  role: string | null;
};

export default function ContractStatusActions({ projectId, contractId, status, role }: Props) {
  const router   = useRouter();
  const [busy, setBusy] = useState<ContractStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = (TRANSITIONS[status] ?? []).filter(a => role && a.allowedRoles.includes(role));

  if (actions.length === 0) return null;

  async function transition(toStatus: ContractStatus) {
    setBusy(toStatus);
    setError(null);
    try {
      const res  = await fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: toStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update contract.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--surface-border, #e4e7f0)" }}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(13,17,68,0.4)" }}>
        Contract actions
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.to}
            onClick={() => transition(a.to)}
            disabled={!!busy}
            className="rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ color: a.color, backgroundColor: a.bg, border: `1px solid ${a.border}` }}
          >
            {busy === a.to ? "Updating…" : a.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}
