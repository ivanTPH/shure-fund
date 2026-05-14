import type { ApprovalReleaseRecord } from "@/lib/approvalReleaseData";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function ReleaseSummaryCard({
  record,
  title,
}: {
  record: ApprovalReleaseRecord;
  title: string;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_22px_54px_rgba(0,0,0,0.24)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Releasable now</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(record.releasableAmount)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Held amount</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(record.heldAmount)}</p>
        </div>
      </div>
    </section>
  );
}
