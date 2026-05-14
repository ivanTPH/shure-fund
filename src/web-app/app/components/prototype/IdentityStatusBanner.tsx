import StatusBadge from "./StatusBadge";

export default function IdentityStatusBanner({
  status,
  detail,
}: {
  status: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#DDE3EA] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#12B3A8]">Identity status</p>
          <p className="mt-1 text-sm font-semibold text-[#0B0F1A]">Trusted identity controls</p>
          <p className="mt-1 text-xs leading-5 text-[#667085]">{detail}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
