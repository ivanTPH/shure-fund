import Link from "next/link";

import StatusBadge from "./StatusBadge";

export default function SetupStatusCard({
  title,
  detail,
  status,
  href,
}: {
  title: string;
  detail: string;
  status: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">{detail}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--brand-aqua)]">Open</p>
    </Link>
  );
}
