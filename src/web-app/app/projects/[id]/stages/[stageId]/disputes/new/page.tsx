"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../../components/AppShell";

export default function NewDisputePage() {
  const router = useRouter();
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();

  const [reason, setReason]               = useState("");
  const [disputedValue, setDisputedValue] = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) { setError("Reason is required."); return; }
    const dv = parseFloat(disputedValue);
    if (isNaN(dv) || dv <= 0) { setError("Disputed value must be a positive number."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          stageId,
          reason:        reason.trim(),
          disputedValue: dv,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to raise dispute."); return; }
      router.push(`/projects/${projectId}/stages/${stageId}/disputes/${data.dispute.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8">
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← Back to stage
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Raise dispute</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Raise a formal dispute against this stage. The commercial team will be notified to respond.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
              Disputed value (£)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              placeholder="e.g. 12500"
              value={disputedValue}
              onChange={(e) => setDisputedValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
              Reason for dispute
            </label>
            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              rows={5}
              placeholder="Describe the issue, the expected outcome, and any relevant context…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Error</p>
              <p className="mt-1 text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#dc2626" }}
          >
            {submitting ? "Submitting…" : "Raise dispute"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
