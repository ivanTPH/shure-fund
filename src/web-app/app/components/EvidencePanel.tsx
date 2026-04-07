import type { EvidenceStatus, EvidenceType } from "@/lib/shureFundModels";
import type { StageDetailModel } from "@/lib/systemState";

function getActionButtonClass(kind: "primary" | "secondary", disabled: boolean) {
  if (kind === "primary") {
    return disabled
      ? "min-h-11 rounded-2xl bg-slate-300 px-4 py-2 text-xs font-medium text-white"
      : "min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-medium text-white";
  }

  return disabled
    ? "min-h-11 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400"
    : "min-h-11 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900";
}

function getEvidenceStatusTone(status: string) {
  if (status === "accepted") {
    return "bg-teal-50 text-teal-900";
  }

  if (status === "rejected" || status === "requires_more") {
    return "bg-amber-50 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function getReadinessLabel(readiness: StageDetailModel["actionReadiness"][keyof StageDetailModel["actionReadiness"]]) {
  if (readiness.readinessState === "available") return "Primary action";
  if (readiness.readinessState === "complete") return "Completed";
  return "Unavailable";
}

function getReadinessMessage(
  readiness: StageDetailModel["actionReadiness"][keyof StageDetailModel["actionReadiness"]],
  formMessage?: string,
) {
  if (formMessage) {
    return formMessage;
  }

  const missing = readiness.missingPrerequisites[0];
  if (missing && readiness.readinessState !== "available" && readiness.readinessState !== "complete") {
    return missing;
  }

  if (readiness.readinessState === "waiting_on_other_role" && readiness.nextOwnerLabel) {
    return `${readiness.reasonLabel} ${readiness.nextOwnerLabel} must act first.`;
  }

  if (readiness.readinessState === "waiting_on_prerequisite" && readiness.nextConditionLabel) {
    return `${readiness.reasonLabel} ${readiness.nextConditionLabel}`;
  }

  return readiness.reasonLabel;
}

export default function EvidencePanel({
  detail,
  evidenceTitle,
  evidenceType,
  onEvidenceTitleChange,
  onEvidenceTypeChange,
  onAddEvidence,
  onUpdateEvidenceStatus,
}: {
  detail: StageDetailModel;
  evidenceTitle: string;
  evidenceType: EvidenceType;
  onEvidenceTitleChange: (value: string) => void;
  onEvidenceTypeChange: (value: EvidenceType) => void;
  onAddEvidence: () => void;
  onUpdateEvidenceStatus: (requirementId: string, status: EvidenceStatus) => void;
}) {
  const canAddItem = detail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length > 0;
  const addItemHelp = getReadinessMessage(
    detail.actionReadiness.addEvidence,
    detail.actionReadiness.addEvidence.isAvailable && evidenceTitle.trim().length === 0
      ? "Enter a supporting item title before adding it to this work package."
      : undefined,
  );
  const reviewHelp = getReadinessMessage(detail.actionReadiness.reviewEvidence);

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Supporting Documents & Supporting Information</h3>
          <p className="mt-1 text-sm text-slate-500">Status: {detail.evidenceSummary.reviewStatusLabel}</p>
          <p className="mt-2 text-sm text-slate-600">{detail.evidenceSummary.headline}</p>
          <p className="mt-1 text-sm text-slate-600">{detail.evidenceSummary.nextEvidenceStepLabel ?? detail.sectionGuidance.evidence.recommendedAction}</p>
          {!detail.actionReadiness.addEvidence.isAvailable && !detail.actionReadiness.reviewEvidence.isAvailable ? (
            <p className="mt-2 text-xs text-slate-500">This role can view evidence only.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sufficiency</p>
            <p className="mt-1 text-sm text-slate-900">{detail.evidenceSummary.sufficiencyLabel}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Accepted</p>
            <p className="mt-1 text-sm text-slate-900">{detail.evidenceSummary.acceptedCountLabel}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pending</p>
            <p className="mt-1 text-sm text-slate-900">{detail.evidenceSummary.pendingCountLabel}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rejected</p>
            <p className="mt-1 text-sm text-slate-900">{detail.evidenceSummary.rejectedCountLabel}</p>
          </div>
        </div>
        {detail.evidenceSummary.blockingConditionLabel ? (
          <p className="mt-3 text-sm text-slate-600">{detail.evidenceSummary.blockingConditionLabel}</p>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Add supporting item</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem_10rem]">
          <input
            className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
            placeholder="Supporting item title"
            value={evidenceTitle}
            onChange={(event) => onEvidenceTitleChange(event.target.value)}
          />
          <select
            className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
            value={evidenceType}
            onChange={(event) => onEvidenceTypeChange(event.target.value as EvidenceType)}
          >
            <option value="file">Supporting Document</option>
            <option value="form">Supporting Information</option>
          </select>
          <button
            type="button"
            onClick={onAddEvidence}
            disabled={!canAddItem}
            className={`disabled:cursor-not-allowed ${getActionButtonClass("primary", !canAddItem).replace("min-h-11 px-4 py-2 text-xs", "min-h-12 px-4 py-3 text-sm")}`}
          >
            Add Item
          </button>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {canAddItem ? "Primary action" : getReadinessLabel(detail.actionReadiness.addEvidence)}
        </p>
        <p className="mt-1 text-xs text-slate-500">{addItemHelp}</p>
      </div>

      <div className="mt-3 grid gap-3">
        {detail.evidence.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-4 ${
              detail.actionReadiness.reviewEvidence.isAvailable ? "border-slate-900/10 bg-slate-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getEvidenceStatusTone(item.record?.status ?? "missing")}`}
                  >
                    {item.record?.status ?? "missing"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {item.type === "file" ? "Supporting Document" : "Supporting Information"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {(["pending", "accepted", "rejected", "requires_more"] as EvidenceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onUpdateEvidenceStatus(item.id, status)}
                    disabled={!detail.actionReadiness.reviewEvidence.isAvailable}
                    className={`disabled:cursor-not-allowed ${
                      getActionButtonClass(status === "accepted" ? "primary" : "secondary", !detail.actionReadiness.reviewEvidence.isAvailable)
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            {detail.actionReadiness.reviewEvidence.isAvailable ? (
              <p className="mt-2 text-sm text-slate-600">{detail.evidenceSummary.nextEvidenceStepLabel ?? "Accept the evidence when it is complete. Use the other controls when review cannot clear yet."}</p>
            ) : null}
            {!detail.actionReadiness.reviewEvidence.isAvailable ? (
              <p className="mt-2 text-sm text-slate-600">{reviewHelp}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
