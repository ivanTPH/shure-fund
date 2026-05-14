import type { ReactNode } from "react";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function TaskSummaryCard({
  title,
  projectName,
  value,
  status,
  explanation,
  children,
}: {
  title: string;
  projectName: string;
  value: number;
  status: string;
  explanation: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Task</p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-white">{title}</h2>
      <p className="mt-1 text-sm text-neutral-400">{projectName}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Value</p>
          <p className="mt-1 text-sm font-semibold text-white">{currency(value)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-white">{status}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">What is needed</p>
        <p className="mt-2 text-sm leading-6 text-neutral-300">{explanation}</p>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
