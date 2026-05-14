import type { ReactNode } from "react";

export default function ActionCard({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#10B981]">{eyebrow}</p> : null}
      <p className={`${eyebrow ? "mt-2" : ""} text-base font-semibold text-[#0B0F1A]`}>{title}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
