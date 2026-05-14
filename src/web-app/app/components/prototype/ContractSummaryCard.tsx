import type { ContractRecord, ProjectRecord } from "@/lib/prototypeData";

import StatusBadge from "./StatusBadge";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ContractSummaryCard({
  project,
  contract,
}: {
  project: ProjectRecord;
  contract: ContractRecord;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_26px_64px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Contract</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{contract.title}</h2>
          <p className="mt-1 text-sm text-neutral-400">{project.name}</p>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Contract value</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(contract.value)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Funding state</p>
          <p className="mt-1 text-sm font-semibold text-white">{contract.fundingState}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Status summary</p>
        <p className="mt-2 text-sm leading-6 text-neutral-300">{contract.statusSummary}</p>
      </div>
    </section>
  );
}
