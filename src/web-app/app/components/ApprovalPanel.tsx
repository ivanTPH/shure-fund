import type { ApprovalRole } from "@/lib/shureFundModels";
import type { StageDetailModel } from "@/lib/systemState";

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
      </div>
      <div className="mt-3 grid gap-3">
        {detail.approvals.map((approval) => (
          <article key={approval.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium capitalize">{approval.role}</p>
                <p className="mt-1 text-sm text-slate-500">{approval.status}</p>
                {approval.sequenceBlocked ? (
                  <p className="mt-1 text-xs text-amber-700">Waiting for the earlier approval step.</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onApprove(approval.role)}
                  disabled={!approval.canAct}
                  className="min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReject(approval.role)}
                  disabled={!approval.canAct}
                  className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
