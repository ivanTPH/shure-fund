import Link from "next/link";

import type { ProjectRecord } from "@/lib/prototypeData";

import StatusBadge from "./StatusBadge";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ProjectCard({
  project,
}: {
  project: ProjectRecord;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_54px_rgba(0,0,0,0.24)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Project</p>
          <p className="mt-2 text-lg font-semibold text-white">{project.name}</p>
          <p className="mt-1 text-sm text-neutral-400">{project.location}</p>
        </div>
        <StatusBadge status={project.fundingStatus} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-xs text-neutral-500">Total value</p>
          <p className="mt-1 text-sm font-bold text-white">{currency(project.totalValue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-xs text-neutral-500">Funding state</p>
          <p className="mt-1 text-sm font-bold text-white">{project.fundingStatus}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Next step</p>
          <p className="mt-1 text-sm font-medium text-neutral-100">{project.actionCue}</p>
        </div>
        <span className="rounded-full bg-[var(--brand-aqua)] px-3 py-1.5 text-sm font-semibold text-[#071125]">Open</span>
      </div>
    </Link>
  );
}
