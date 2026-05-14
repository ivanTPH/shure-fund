export default function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    status === "Available to release" || status === "Released" || status === "Funded" || status === "Approved" || status === "Verified" || status === "Complete"
      ? "border-teal-400/25 bg-teal-500/10 text-teal-50"
      : status === "Disputed" || status === "At risk" || status === "Returned" || status === "Retry required" || status === "Rejected" || status === "Required" || status === "Frozen in dispute"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : status === "In progress" || status === "Sent" || status === "Accepted" || status === "Pending" || status === "Awaiting review" || status === "Awaiting funding confirmation" || status === "Awaiting professional assurance" || status === "Awaiting commercial approval" || status === "Clarification requested"
          ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
          : "border-white/10 bg-white/5 text-neutral-100";

  return <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] ${tone}`}>{status}</span>;
}
