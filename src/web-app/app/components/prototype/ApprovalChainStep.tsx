import type { ApprovalChainStep as ApprovalChainStepType } from "@/lib/approvalReleaseData";

export default function ApprovalChainStep({
  step,
}: {
  step: ApprovalChainStepType;
}) {
  const tone =
    step.state === "Complete"
      ? "border-teal-400/25 bg-teal-500/10 text-teal-50"
      : step.state === "Current"
        ? "border-blue-400/25 bg-blue-500/10 text-blue-100"
        : step.state === "Blocked"
          ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/5 text-neutral-100";

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{step.label}</p>
          {step.actor ? <p className="mt-1 text-sm text-neutral-400">{step.actor}</p> : null}
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}>{step.state}</span>
      </div>
      {step.timestamp ? <p className="mt-2 text-xs text-neutral-500">{step.timestamp}</p> : null}
    </div>
  );
}
