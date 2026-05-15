"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Stage = { name: string; value: string };

export default function NewContractPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [stages, setStages] = useState<Stage[]>([{ name: "", value: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStage() {
    setStages((s) => [...s, { name: "", value: "" }]);
  }

  function removeStage(i: number) {
    setStages((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStage(i: number, field: keyof Stage, val: string) {
    setStages((s) => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("Contract title is required."); return; }
    const parsedStages = stages.map((s) => ({ name: s.name.trim(), value: parseFloat(s.value) }));
    if (parsedStages.some((s) => !s.name || isNaN(s.value) || s.value <= 0)) {
      setError("Every stage needs a name and a positive value.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), contractorName: contractorName.trim(), stages: parsedStages }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create contract."); return; }
      router.push(`/projects/${projectId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  const totalValue = stages.reduce((sum, s) => {
    const v = parseFloat(s.value);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "#0d1144" }}>
      <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
        ← Back to project
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white">New contract</h1>
      <p className="mt-1 text-sm text-neutral-400">Create a contract and define its payment stages.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">Contract title</label>
          <input
            type="text"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            placeholder="e.g. Ground works package"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">Contractor name</label>
          <input
            type="text"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none"
            placeholder="e.g. Apex Construction Ltd"
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
          />
        </div>

        {/* Stages */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Payment stages
            </label>
            {totalValue > 0 && (
              <span className="text-xs text-neutral-400">Total: {gbp.format(totalValue)}</span>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
                  placeholder={`Stage ${i + 1} name`}
                  value={stage.name}
                  onChange={(e) => updateStage(i, "name", e.target.value)}
                  required
                />
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="w-28 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none"
                  placeholder="£ value"
                  value={stage.value}
                  onChange={(e) => updateStage(i, "value", e.target.value)}
                  required
                />
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-500 hover:text-red-400 transition"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStage}
            className="mt-2 flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm text-neutral-400 hover:text-white transition"
            style={{ border: "1px dashed rgba(255,255,255,0.12)" }}
          >
            + Add stage
          </button>
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
          {submitting ? "Creating…" : "Create contract"}
        </button>
      </form>
    </div>
  );
}
