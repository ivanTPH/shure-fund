import Link from "next/link";

import type { ContractRecord } from "@/lib/prototypeData";

import StatusBadge from "./StatusBadge";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ContractCard({
  projectId,
  contract,
}: {
  projectId: string;
  contract: ContractRecord;
}) {
  return (
    <Link
      href={`/projects/${projectId}/contracts/${contract.id}`}
      className="block rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_54px_rgba(0,0,0,0.24)] transition-colors hover:bg-white/8"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Contract</p>
          <p className="mt-2 text-lg font-semibold text-white">{contract.title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{contract.scopeSummary}</p>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-xs text-neutral-500">Value</p>
          <p className="mt-1 text-sm font-bold text-white">{currency(contract.value)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-xs text-neutral-500">Funding state</p>
          <p className="mt-1 text-sm font-bold text-white">{contract.fundingState}</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
          <span>Work progress</span>
          <span>{contract.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-aqua)] via-white to-[#4c6fff]" style={{ width: `${contract.progressPercent}%` }} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Next action</p>
          <p className="mt-1 text-sm font-medium text-neutral-100">{contract.nextAction}</p>
        </div>
        <span className="text-lg leading-none text-[var(--brand-aqua)]">›</span>
      </div>
    </Link>
  );
}
