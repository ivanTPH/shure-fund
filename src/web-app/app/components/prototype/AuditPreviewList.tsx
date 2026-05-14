import type { ApprovalAuditEvent } from "@/lib/approvalReleaseData";

export default function AuditPreviewList({
  events,
}: {
  events: ApprovalAuditEvent[];
}) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{event.label}</p>
              <p className="mt-1 text-sm text-neutral-300">{event.detail}</p>
            </div>
            <p className="text-xs text-neutral-500">{event.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
