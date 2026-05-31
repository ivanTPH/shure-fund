"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../components/AppShell";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Project name is required."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), location: location.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project."); return; }
      router.push(`/projects/${data.project.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-200";

  return (
    <AppShell>
      <div className="min-h-full px-4 md:px-8 py-8 max-w-lg mx-auto">
        <Link href="/projects" className="text-xs font-medium transition hover:opacity-70" style={{ color: "rgba(13,17,68,0.5)" }}>
          ← Projects
        </Link>

        <h1 className="mt-4 text-2xl font-bold" style={{ color: "var(--brand-navy, #0D1144)" }}>New project</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(13,17,68,0.5)" }}>Create a new construction finance project.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(13,17,68,0.45)" }}>
              Project name
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Riverside Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(13,17,68,0.45)" }}>
              Location
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Manchester, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff", color: "var(--brand-navy, #0D1144)" }}
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
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-navy, #0D1144)" }}
          >
            {submitting ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
