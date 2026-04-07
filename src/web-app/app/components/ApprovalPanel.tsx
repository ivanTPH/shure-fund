import type { ApprovalRole } from "@/lib/shureFundModels";
import type { DerivedActionDescriptor, StageDetailModel } from "@/lib/systemState";

function getActionButtonClass(descriptor: DerivedActionDescriptor, disabled: boolean) {
  if (descriptor.confidence === "high" && descriptor.isPrimary) {
    return disabled
      ? "min-h-11 rounded-2xl bg-slate-300 px-4 py-2 text-left text-sm font-medium text-white"
      : "min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-left text-sm font-medium text-white";
  }

  return disabled
    ? "min-h-11 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-400"
    : "min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-left text-sm font-medium text-slate-900";
}

function getApprovalStatusTone(status: string) {
  if (status === "approved") {
    return "bg-teal-50 text-teal-900";
  }

  if (status === "rejected") {
    return "bg-amber-50 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function getDescriptorStatus(descriptor: DerivedActionDescriptor) {
  if (descriptor.confidence === "blocked") return "Blocked";
  if (descriptor.isPrimary && descriptor.confidence === "high") return "Primary action";
  return "Secondary action";
}

export default function ApprovalPanel({
  detail,
  onApprove,
  onReject,
}: {
  detail: StageDetailModel;
  onApprove: (role: ApprovalRole) => void;
  onReject: (role: ApprovalRole) => void;
}) {
  return (
    <section>
      <div>
        <h3 className="text-sm font-medium text-slate-900">Approval workflow</h3>
        <p className="mt-1 text-xs text-slate-500">{detail.approvalSummary.approvalProgressLabel}</p>
        <p className="mt-2 text-sm text-slate-600">{detail.approvalSummary.headline}</p>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active approval</p>
            <p className="mt-1 text-sm text-slate-900">{detail.approvalSummary.activeApprovalLabel ?? "No active approval step"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Next approver</p>
            <p className="mt-1 text-sm text-slate-900">{detail.approvalSummary.nextApproverLabel ?? "No next approver queued"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Completed</p>
            <p className="mt-1 text-sm text-slate-900">{detail.approvalSummary.completedApprovals.length > 0 ? detail.approvalSummary.completedApprovals.join(", ") : "None yet"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pending</p>
            <p className="mt-1 text-sm text-slate-900">{detail.approvalSummary.pendingApprovals.length > 0 ? detail.approvalSummary.pendingApprovals.join(", ") : "No pending approvals"}</p>
          </div>
        </div>
        {detail.approvalSummary.blockingConditionLabel ? (
          <p className="mt-3 text-sm text-slate-600">{detail.approvalSummary.blockingConditionLabel}</p>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3">
        {detail.approvals.map((approval) => (
          <article
            key={approval.id}
            className={`rounded-2xl border p-4 ${
              approval.readiness.readinessState === "available" ? "border-slate-900/10 bg-slate-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium capitalize text-slate-900">{approval.role}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getApprovalStatusTone(approval.status)}`}>
                    {approval.status}
                  </span>
                </div>
                <p className={`mt-1 text-xs ${
                  approval.readiness.readinessState === "waiting_on_prerequisite" || approval.readiness.readinessState === "waiting_on_other_role"
                    ? "text-amber-700"
                    : approval.readiness.readinessState === "complete"
                      ? "text-teal-700"
                      : "text-slate-500"
                }`}>
                  {approval.approveAction.stateTransitionPreview.fromState} → {approval.approveAction.stateTransitionPreview.toState}
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {approval.readiness.readinessState === "complete" ? "Completed" : getDescriptorStatus(approval.approveAction)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onApprove(approval.role)}
                      disabled={!approval.readiness.isAvailable}
                      className={`disabled:cursor-not-allowed ${getActionButtonClass(approval.approveAction, !approval.readiness.isAvailable)}`}
                    >
                      <span className="block">{approval.approveAction.label}</span>
                      <span className="mt-1 block text-xs opacity-80">
                        {approval.approveAction.stateTransitionPreview.fromState} → {approval.approveAction.stateTransitionPreview.toState}
                      </span>
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {approval.readiness.readinessState === "complete" ? "Completed" : getDescriptorStatus(approval.rejectAction)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onReject(approval.role)}
                      disabled={!approval.readiness.isAvailable}
                      className={`disabled:cursor-not-allowed ${getActionButtonClass(approval.rejectAction, !approval.readiness.isAvailable)}`}
                    >
                      <span className="block">{approval.rejectAction.label}</span>
                      <span className="mt-1 block text-xs opacity-80">
                        {approval.rejectAction.stateTransitionPreview.fromState} → {approval.rejectAction.stateTransitionPreview.toState}
                      </span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {approval.readiness.isAvailable
                    ? approval.approveAction.sideEffects?.[0] ?? approval.approveAction.outcomeLabel
                    : approval.approveAction.blockerSummary ?? approval.readiness.nextConditionLabel}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
