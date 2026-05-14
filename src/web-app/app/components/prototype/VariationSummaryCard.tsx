import StatusBadge from "./StatusBadge";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function VariationSummaryCard({
  title,
  summary,
  valueImpact,
  timeImpact,
  status,
}: {
  title: string;
  summary: string;
  valueImpact: number;
  timeImpact: string;
  status: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Variation</p>
          <p className="mt-2 text-base font-semibold text-white">{title}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-300">{summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Value impact</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(valueImpact)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Time impact</p>
          <p className="mt-1 text-sm font-semibold text-white">{timeImpact}</p>
        </div>
      </div>
    </div>
  );
}
