"use client";

/**
 * Edit an existing stage.
 * /projects/[id]/contracts/[contractId]/stages/[stageId]/edit
 * Accessible to: admin, developer. Only draft/sent stages.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../../../../../components/AppShell";
import { Skeleton } from "../../../../../../../components/Skeleton";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

type StageData = {
  id: string;
  name: string;
  description: string | null;
  value: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export default function EditStagePage() {
  const router = useRouter();
  const { id: projectId, contractId, stageId } =
    useParams<{ id: string; contractId: string; stageId: string }>();

  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [original, setOriginal]       = useState<StageData | null>(null);

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue]             = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Load stage data from the contract detail API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}/stages/${stageId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setLoadError((data as { error?: string }).error ?? "Failed to load stage.");
          return;
        }
        const data = await res.json() as { stage: StageData };
        setOriginal(data.stage);
        setName(data.stage.name);
        setDescription(data.stage.description ?? "");
        setValue(String(data.stage.value));
        setStartDate(data.stage.start_date?.slice(0, 10) ?? "");
        setEndDate(data.stage.end_date?.slice(0, 10) ?? "");
      } catch {
        setLoadError("Network error loading stage.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, contractId, stageId]);

  const parsedValue = parseFloat(value);
  const validValue  = !isNaN(parsedValue) && parsedValue > 0;
  const valueDelta  = original ? parsedValue - Number(original.value) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Stage name is required."); return; }
    if (!validValue)  { setError("Enter a positive value."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/stages/${stageId}`,
        {
          method:  "PATCH",
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
      if (!res.ok) { setError((data as { error?: string }).error ?? "Update failed."); return; }
      router.push(`/projects/${projectId}/contracts/${contractId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 md:px-8 py-8 max-w-lg mx-auto">
          <Skeleton.Form />
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-red-600">{loadError}</p>
        </div>
      </AppShell>
    );
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
            Edit stage
          </h1>
          {original && (
            <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>
              Editing <span className="font-semibold">{original.name}</span>
              {" "}— currently{" "}
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: "rgba(37,99,235,0.1)", color: "#2563eb" }}
              >
                {original.status.replace(/_/g, " ")}
              </span>
            </p>
          )}
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
            {validValue && <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>{gbp.format(parsedValue)}</p>}
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

          {/* Value change preview */}
          {validValue && valueDelta !== 0 && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: valueDelta > 0 ? "rgba(37,99,235,0.04)" : "rgba(220,38,38,0.04)",
                border: `1px solid ${valueDelta > 0 ? "rgba(37,99,235,0.15)" : "rgba(220,38,38,0.15)"}`,
              }}
            >
              <p className="text-xs" style={{ color: "rgba(13,17,68,0.45)" }}>Contract total will change by</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: valueDelta > 0 ? "#2563eb" : "#dc2626" }}>
                {valueDelta > 0 ? "+" : ""}{gbp.format(valueDelta)}
              </p>
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
            {submitting ? "Saving changes…" : "Save changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
