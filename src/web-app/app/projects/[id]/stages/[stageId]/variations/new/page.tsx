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
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}/stages/${stageId}`}
        className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to stage
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">Submit variation</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Propose a change to the stage scope or value. Requires commercial approval and wallet confirmation.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Description
          </label>
          <textarea
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            rows={4}
            placeholder="Describe the scope or value change and the reason for it…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Value change (£)
          </label>
          <p className="mt-0.5 text-xs text-neutral-500">Positive = uplift, negative = reduction</p>
          <input
            type="number"
            step="0.01"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            placeholder="e.g. 5000 or -2000"
            value={valueChange}
            onChange={(e) => setValueChange(e.target.value)}
            required
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
          style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          {submitting ? "Submitting…" : "Submit variation for review"}
        </button>
      </form>
    </div>
    </AppShell>
  );
}
