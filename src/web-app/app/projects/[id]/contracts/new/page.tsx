"use client";

/**
 * /projects/[id]/contracts/new
 *
 * Create a new contract with one or more payment stages.
 * Accessible to: admin, developer.
 *
 * The contractor is identified by email — they must already have a
 * registered account on Shure.Fund before being added as a contractor.
 */

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";

type Stage = {
  name: string;
  description: string;
  value: string;
  startDate: string;
  endDate: string;
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function NewContractPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();

  const [contractorEmail, setContractorEmail] = useState("");
  const [stages, setStages] = useState<Stage[]>([
    { name: "", description: "", value: "", startDate: "", endDate: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStage() {
    setStages((s) => [...s, { name: "", description: "", value: "", startDate: "", endDate: "" }]);
  }

  function removeStage(i: number) {
    setStages((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStage(i: number, field: keyof Stage, val: string) {
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, [field]: val } : st)));
  }

  const totalValue = stages.reduce((sum, s) => {
    const v = parseFloat(s.value);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contractorEmail.trim()) { setError("Contractor email is required."); return; }

    const parsedStages = stages.map((s) => ({
      name:        s.name.trim(),
      description: s.description.trim() || undefined,
      value:       parseFloat(s.value),
      startDate:   s.startDate || undefined,
      endDate:     s.endDate || undefined,
    }));

    if (parsedStages.some((s) => !s.name || isNaN(s.value) || s.value <= 0)) {
      setError("Every stage needs a name and a positive value.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contracts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ contractorEmail: contractorEmail.trim(), stages: parsedStages }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create contract."); return; }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto" style={{ backgroundColor: "#0d1144" }}>
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-neutral-400 hover:text-white">
          ← Back to project
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white">New contract</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Define the contractor and payment stages. The contractor must already have a Shure.Fund account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">

          {/* Contractor */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">
              Contractor email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-400/50 transition"
              placeholder="contractor@theircompany.com"
              value={contractorEmail}
              onChange={(e) => setContractorEmail(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-neutral-600">
              The contractor must be registered — use a dev quick-login email (e.g. contractor@test.com).
            </p>
          </div>

          {/* Stages */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Payment stages
              </label>
              {totalValue > 0 && (
                <span className="text-xs font-semibold text-neutral-300">
                  Total: {gbp.format(totalValue)}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className="rounded-[20px] p-4 space-y-3"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-400">Stage {i + 1}</p>
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStage(i)}
                        className="text-xs text-neutral-600 hover:text-red-400 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Name + Value */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none"
                      placeholder={`Stage ${i + 1} name (e.g. Foundation Package)`}
                      value={stage.name}
                      onChange={(e) => updateStage(i, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      className="w-32 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none"
                      placeholder="£ value"
                      value={stage.value}
                      onChange={(e) => updateStage(i, "value", e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none"
                    placeholder="Description (optional)"
                    value={stage.description}
                    onChange={(e) => updateStage(i, "description", e.target.value)}
                  />

                  {/* Dates */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-600 mb-1">Start date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                        style={{ colorScheme: "dark" }}
                        value={stage.startDate}
                        onChange={(e) => updateStage(i, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-600 mb-1">End date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                        style={{ colorScheme: "dark" }}
                        value={stage.endDate}
                        onChange={(e) => updateStage(i, "endDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addStage}
              className="mt-3 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm text-neutral-400 hover:text-white transition"
              style={{ border: "1px dashed rgba(255,255,255,0.12)" }}
            >
              + Add another stage
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)" }}
          >
            {submitting ? "Creating contract…" : "Create contract"}
          </button>

          <p className="text-xs text-neutral-600 text-center pb-4">
            Stages are created in draft status. Advance them to in-progress once work begins.
          </p>
        </form>
      </div>
    </AppShell>
  );
}
