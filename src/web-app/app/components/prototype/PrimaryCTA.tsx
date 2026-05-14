import type { ReactNode } from "react";

export default function PrimaryCTA({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  if (href) {
    return (
      <a
        href={href}
        className="block w-full rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e] shadow-[0_10px_24px_rgba(113,243,203,0.18)]"
      >
        {children}
      </a>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-[var(--brand-aqua)] px-4 py-3 text-center text-sm font-semibold text-[#04111e] shadow-[0_10px_24px_rgba(113,243,203,0.18)]">
      {children}
    </div>
  );
}
