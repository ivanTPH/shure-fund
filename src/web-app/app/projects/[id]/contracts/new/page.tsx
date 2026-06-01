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

const INPUT_STYLE = {
  border: "1px solid var(--surface-border, #e4e7f0)",
  backgroundColor: "#fff",
  color: "var(--brand-navy, #0D1144)",
} as const;

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
      router.push(`/projects/${projectId}/contracts/${data.contractId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8 max-w-2xl mx-auto">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← Back to project
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>New contract</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            Define the contractor and payment stages. The contractor must already have a Shure.Fund account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Contractor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Contractor email <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="email"
              required
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={INPUT_STYLE}
              placeholder="contractor@theircompany.com"
              value={contractorEmail}
              onChange={(e) => setContractorEmail(e.target.value)}
            />
            <p className="text-xs" style={{ color: "rgba(13,17,68,0.4)" }}>
              The contractor must be registered — invite them first if needed.
            </p>
          </div>

          {/* Stages */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                Payment stages
              </label>
              {totalValue > 0 && (
                <span className="text-xs font-semibold" style={{ color: "var(--brand-navy, #0D1144)" }}>
                  Total: {gbp.format(totalValue)}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className="rounded-[20px] p-4 space-y-3"
                  style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#f7f8fc" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "rgba(13,17,68,0.5)" }}>Stage {i + 1}</p>
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStage(i)}
                        className="text-xs transition hover:opacity-70"
                        style={{ color: "#dc2626" }}
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
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={INPUT_STYLE}
                      placeholder={`Stage ${i + 1} name`}
                      value={stage.name}
                      onChange={(e) => updateStage(i, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      className="w-32 rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={INPUT_STYLE}
                      placeholder="£ value"
                      value={stage.value}
                      onChange={(e) => updateStage(i, "value", e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={INPUT_STYLE}
                    placeholder="Description (optional)"
                    value={stage.description}
                    onChange={(e) => updateStage(i, "description", e.target.value)}
                  />

                  {/* Dates */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>Start date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={INPUT_STYLE}
                        value={stage.startDate}
                        onChange={(e) => updateStage(i, "startDate", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] mb-1" style={{ color: "rgba(13,17,68,0.45)" }}>End date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={INPUT_STYLE}
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
              className="mt-3 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-70"
              style={{ border: "1px dashed var(--surface-border, #e4e7f0)", color: "rgba(13,17,68,0.5)", backgroundColor: "#fff" }}
            >
              + Add another stage
            </button>
          </div>

          {error && (
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {submitting ? "Creating contract…" : "Create contract"}
          </button>

          <p className="text-xs text-center pb-4" style={{ color: "rgba(13,17,68,0.4)" }}>
            Stages are created in draft status. Advance them to in-progress once work begins.
          </p>
        </form>
      </div>
    </AppShell>
  );
}
