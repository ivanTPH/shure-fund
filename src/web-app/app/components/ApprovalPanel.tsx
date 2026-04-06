import type { ApprovalRole } from "@/lib/shureFundModels";
import type { StageDetailModel } from "@/lib/systemState";

function getActionButtonClass(kind: "primary" | "secondary", disabled: boolean) {
  if (kind === "primary") {
    return disabled
      ? "min-h-11 rounded-2xl bg-slate-300 px-4 py-2 text-sm font-medium text-white"
      : "min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white";
  }

  return disabled
    ? "min-h-11 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
    : "min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900";
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
        <h3 className="text-sm font-semibold text-slate-900">Approval Workflow</h3>
        <p className="mt-1 text-sm text-slate-500">Status: {detail.approvalState.replaceAll("_", " ")}</p>
        <p className="mt-2 text-sm text-slate-600">{detail.sectionGuidance.approvals.recommendedAction}</p>
      </div>
      <div className="mt-3 grid gap-3">
        {detail.approvals.map((approval) => (
          <article
            key={approval.id}
            className={`rounded-2xl border p-4 ${
              approval.canAct ? "border-slate-900/10 bg-slate-50" : "border-slate-200 bg-white"
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
                {approval.sequenceBlocked ? (
                  <p className="mt-1 text-xs text-amber-700">Waiting for the earlier approval step.</p>
                ) : null}
                {!approval.canAct && !approval.sequenceBlocked && approval.status !== "approved" ? (
                  <p className="mt-1 text-xs text-slate-500">{approval.unavailableReason}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {approval.canAct ? "Primary action" : approval.status === "approved" ? "Completed" : "Unavailable"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onApprove(approval.role)}
                      disabled={!approval.canAct}
                      className={`disabled:cursor-not-allowed ${getActionButtonClass("primary", !approval.canAct)}`}
                    >
                      Approve
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {approval.canAct ? "Secondary action" : approval.status === "approved" ? "Completed" : "Unavailable"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onReject(approval.role)}
                      disabled={!approval.canAct}
                      className={`disabled:cursor-not-allowed ${getActionButtonClass("secondary", !approval.canAct)}`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {approval.canAct
                    ? `Record the ${approval.role} decision now.`
                    : approval.status === "approved"
                      ? "Approval already completed."
                      : approval.unavailableReason}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
