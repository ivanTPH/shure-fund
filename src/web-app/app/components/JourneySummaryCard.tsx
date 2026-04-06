import type { RoleJourneySummary } from "@/lib/systemState";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const toneStyles = {
  attention: "border-teal-100 bg-teal-50 text-teal-900",
  blocked: "border-slate-200 bg-slate-100 text-slate-900",
  payable: "border-cyan-100 bg-cyan-50 text-cyan-900",
  frozen: "border-slate-300 bg-white text-slate-900",
} as const;

export default function JourneySummaryCard({
  journey,
}: {
  journey: RoleJourneySummary;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{journey.heading}</h2>
        <p className="mt-1 text-sm text-slate-500">
          What needs attention, what is blocked, what is payable, and what is frozen for the current role.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Needs Attention</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{journey.attentionCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Blocked</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{journey.blockedCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Payable Value</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(journey.payableValue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Frozen Value</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{currency.format(journey.frozenValue)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {journey.items.map((item) => (
          <article key={`${item.stageId}-${item.tone}-${item.summary}`} className={`rounded-2xl border p-4 ${toneStyles[item.tone]}`}>
            <p className="font-medium">{item.stageName}</p>
            <p className="mt-1 text-sm opacity-80">{item.summary}</p>
          </article>
        ))}
        {journey.items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No journey items require attention.</p>
        ) : null}
      </div>
    </section>
  );
}
