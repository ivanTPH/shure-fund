"use client";

/**
 * /projects/[id]/settings
 *
 * Project settings — edit name, address, and lifecycle status.
 * Accessible to admin and developer roles only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { Skeleton } from "@/app/components/Skeleton";
import { useToast } from "@/app/components/ToastContext";
import { createClient } from "@/lib/supabase/browser";
import { getRole } from "@/lib/auth";

const navy  = "var(--brand-navy, #0D1144)";
const muted = "rgba(13,17,68,0.45)";
const card  = { border: "1px solid var(--surface-border, #e4e7f0)", backgroundColor: "#fff" } as const;

const VALID_STATUSES = ["active", "on_hold", "completed", "cancelled"] as const;
type ProjectStatus = typeof VALID_STATUSES[number];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active:    "Active",
  on_hold:   "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

type Project = {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  created_at: string;
};

export default function ProjectSettingsPage() {
  const params    = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const router    = useRouter();

  const [project, setProject]   = useState<Project | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const [name,    setName]    = useState("");
  const [address, setAddress] = useState("");
  const [status,  setStatus]  = useState<ProjectStatus>("active");

  const { toast } = useToast();

  // Auth guard
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const role = getRole(user);
      if (role !== "admin" && role !== "developer") {
        router.push(`/projects/${projectId}`);
      }
    });
  }, [projectId, router]);

  // Load project
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        const p: Project = d.project;
        setProject(p);
        setName(p.name);
        setAddress(p.address ?? "");
        setStatus((p.status as ProjectStatus) || "active");
      })
      .catch(() => setError("Failed to load project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    const body: Record<string, string> = {};
    if (name.trim()    !== project.name)    body.name    = name.trim();
    if (address.trim() !== (project.address ?? "")) body.address = address.trim();
    if (status         !== project.status)  body.status  = status;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setSuccess(true);
      toast("No changes to save.", "info");
      setTimeout(() => setSuccess(false), 2000);
      return;
    }

    const res  = await fetch(`/api/projects/${projectId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to save changes.");
      toast(data.error ?? "Failed to save changes.", "error");
    } else {
      setProject(data.project);
      setSuccess(true);
      toast("Project settings saved.", "success");
      setTimeout(() => setSuccess(false), 2500);
    }

    setSaving(false);
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
          <Skeleton.Form />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
          <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
            <p className="text-sm" style={{ color: "#dc2626" }}>{error ?? "Project not found."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell>
      <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--surface-muted, #f7f8fc)" }}>
        <div className="max-w-xl mx-auto space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
            <Link href={`/projects/${projectId}`} className="transition hover:opacity-70">
              {project.name}
            </Link>
            <span>/</span>
            <span>Settings</span>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: navy }}>Project settings</h1>
            <p className="mt-0.5 text-sm" style={{ color: muted }}>Update project name, address, and status.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-[24px] p-5 space-y-5" style={card}>

              {/* Name */}
              <div>
                <label
                  htmlFor="proj-name"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: muted }}
                >
                  Project name
                </label>
                <input
                  id="proj-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    backgroundColor: "#f7f8fc",
                    color: navy,
                  }}
                />
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="proj-address"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: muted }}
                >
                  Site address
                </label>
                <input
                  id="proj-address"
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  maxLength={300}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    backgroundColor: "#f7f8fc",
                    color: navy,
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="proj-status"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: muted }}
                >
                  Status
                </label>
                <select
                  id="proj-status"
                  value={status}
                  onChange={e => setStatus(e.target.value as ProjectStatus)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    border: "1px solid var(--surface-border, #e4e7f0)",
                    backgroundColor: "#f7f8fc",
                    color: navy,
                  }}
                >
                  {VALID_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px]" style={{ color: muted }}>
                  Changing status to &ldquo;completed&rdquo; is irreversible — use the project completion workflow instead.
                </p>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <p className="text-xs font-semibold" style={{ color: "#16a34a" }}>Changes saved.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/projects/${projectId}`}
                className="rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-70"
                style={{ border: "1px solid var(--surface-border, #e4e7f0)", color: muted, backgroundColor: "#fff" }}
              >
                ← Back
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: navy }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="rounded-[24px] p-5" style={{ ...card, borderColor: "#fecaca" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#dc2626" }}>
              Danger zone
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: navy }}>Complete project</p>
                <p className="text-xs mt-0.5" style={{ color: muted }}>
                  Mark this project as complete once all stages are released. Irreversible.
                </p>
              </div>
              <Link
                href={`/projects/${projectId}`}
                className="shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
              >
                Complete →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
