import type { ReactNode } from "react";

export default function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}
