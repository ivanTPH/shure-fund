function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function DisputeBanner({
  amount,
  summary,
}: {
  amount: number;
  summary: string;
}) {
  return (
    <div className="rounded-[28px] border border-amber-400/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">Dispute</p>
      <p className="mt-2 text-base font-semibold text-white">{currency(amount)} frozen in dispute</p>
      <p className="mt-2 text-sm leading-6 text-neutral-200">{summary}</p>
    </div>
  );
}
