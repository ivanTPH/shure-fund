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
  const [evidenceUrl, setEvidenceUrl]     = useState("");
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
          reason:       reason.trim(),
          disputedValue: dv,
          evidenceUrl:  evidenceUrl.trim() || undefined,
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
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "#0d1144" }}>
        <Link
          href={`/projects/${projectId}/stages/${stageId}`}
          className="text-xs font-medium text-neutral-400 hover:text-white"
        >
          ← Back to stage
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Raise dispute</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Raise a formal dispute against this stage. The commercial team will be notified to respond.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
              Disputed value (£)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              placeholder="e.g. 12500"
              value={disputedValue}
              onChange={(e) => setDisputedValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
              Reason for dispute
            </label>
            <textarea
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              rows={5}
              placeholder="Describe the issue, the expected outcome, and any relevant context…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
              Supporting evidence URL{" "}
              <span className="normal-case font-normal text-neutral-600">(optional)</span>
            </label>
            <input
              type="url"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
              placeholder="https://…"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </div>

          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">Error</p>
              <p className="mt-1 text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            {submitting ? "Submitting…" : "Raise dispute"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
