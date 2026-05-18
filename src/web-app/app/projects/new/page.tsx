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

  const inputClass = "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-400/50 transition";

  return (
    <AppShell>
      <div
        className="min-h-screen px-4 md:px-8 py-8 max-w-lg mx-auto"
        style={{ backgroundColor: "#0d1144" }}
      >
        <Link href="/projects" className="text-xs font-medium text-neutral-400 hover:text-white transition">
          ← Projects
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white">New project</h1>
        <p className="mt-1 text-sm text-neutral-400">Create a new construction finance project.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">
              Project name
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Riverside Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">
              Location
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Manchester, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.4)" }}
          >
            {submitting ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
