"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";

export default function NewVariationPage() {
  const router = useRouter();
  const params = useParams<{ id: string; stageId: string }>();
  const { id: projectId, stageId } = params;

  const [description, setDescription] = useState("");
  const [valueChange, setValueChange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const vc = parseFloat(valueChange);
    if (isNaN(vc) || vc === 0) {
      setError("Enter a non-zero value change (positive for uplift, negative for reduction).");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, description: description.trim(), valueChange: vc }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create variation."); return; }

      // Auto-submit (draft → submitted)
      const varId = data.variation.id;
      await fetch(`/api/variations/${varId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });

      router.push(`/projects/${projectId}/stages/${stageId}/variations/${varId}`);
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
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>Submit variation</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Propose a change to the stage scope or value. Requires commercial approval and wallet confirmation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
              Description
            </label>
            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              rows={4}
              placeholder="Describe the scope or value change and the reason for it…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>
              Value change (£)
            </label>
            <p className="mt-0.5 mb-2 text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>Positive = uplift, negative = reduction</p>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-100"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              placeholder="e.g. 5000 or -2000"
              value={valueChange}
              onChange={(e) => setValueChange(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {submitting ? "Submitting…" : "Submit variation for review"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
