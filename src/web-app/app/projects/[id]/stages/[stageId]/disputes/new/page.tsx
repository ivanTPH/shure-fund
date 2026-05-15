"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function NewDisputePage() {
  const router = useRouter();
  const { id: projectId, stageId } = useParams<{ id: string; stageId: string }>();

  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) { setError("Reason is required."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, reason: reason.trim(), evidenceUrl: evidenceUrl.trim() || undefined }),
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
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}/stages/${stageId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">Raise dispute</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Raise a formal dispute against this stage. Commercial will be notified to respond.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">Reason for dispute</label>
          <textarea
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            rows={5}
            placeholder="Describe the issue, the expected outcome, and any relevant context…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Supporting evidence URL <span className="normal-case text-neutral-600">(optional)</span>
          </label>
          <input
            type="url"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            placeholder="https://…"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "#0d1144", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          {submitting ? "Submitting…" : "Raise dispute"}
        </button>
      </form>
    </div>
  );
}
