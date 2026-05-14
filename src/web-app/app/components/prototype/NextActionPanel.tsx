import type { ReactNode } from "react";

export default function NextActionPanel({
  title,
  why,
  cta,
}: {
  title: string;
  why: string;
  cta: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(113,243,203,0.12),rgba(255,255,255,0.02))] p-5 shadow-[0_22px_54px_rgba(0,0,0,0.24)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Next action</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-300">{why}</p>
      <div className="mt-4">{cta}</div>
    </section>
  );
}
