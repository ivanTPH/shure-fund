"use client";

/**
 * Add a stage to an existing contract.
 * /projects/[id]/contracts/[contractId]/add-stage
 * Accessible to: admin, developer.
 */

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../components/AppShell";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function AddStagePage() {
  const router = useRouter();
  const { id: projectId, contractId } = useParams<{ id: string; contractId: string }>();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue]             = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const parsedValue = parseFloat(value);
  const validValue  = !isNaN(parsedValue) && parsedValue > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Stage name is required."); return; }
    if (!validValue)  { setError("Enter a positive value."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/stages`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            name:        name.trim(),
            description: description.trim() || undefined,
            value:       parsedValue,
            startDate:   startDate || undefined,
            endDate:     endDate   || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add stage."); return; }
      router.push(`/projects/${projectId}/contracts/${contractId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8 max-w-lg mx-auto">
        <Link
          href={`/projects/${projectId}/contracts/${contractId}`}
          className="text-xs font-medium transition hover:opacity-70"
          style={{ color: "rgba(13,17,68,0.5)" }}
        >
          ← Back to contract
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>
            Add stage
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
            New stages are created in draft status. Advance them to in-progress once work begins.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Stage name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Foundation Package"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Stage value (£) <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="1"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
            {validValue && (
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>
                {gbp.format(parsedValue)}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
              Description <span className="font-normal normal-case" style={{ color: "rgba(13,17,68,0.35)" }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Brief description of this stage"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(13,17,68,0.45)" }}>
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
              />
            </div>
          </div>

          {/* Value preview panel */}
          {validValue && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.15)" }}
            >
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>This will increase the contract total by</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: "#2563eb" }}>{gbp.format(parsedValue)}</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !validValue}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {submitting ? "Adding stage…" : "Add stage"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
