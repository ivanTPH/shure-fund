import StatusBadge from "./StatusBadge";

export default function MembershipCard({
  companyName,
  role,
  context,
  status,
}: {
  companyName: string;
  role: string;
  context: string;
  status: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{companyName}</p>
          <p className="mt-1 text-sm font-medium text-[var(--brand-aqua)]">{role}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-300">{context}</p>
    </div>
  );
}
