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
  const canAddItem = detail.availableActions.addEvidence && evidenceTitle.trim().length > 0;
  const addItemHelp = !detail.availableActions.addEvidence
    ? detail.availableActions.addEvidenceReason
    : evidenceTitle.trim().length === 0
      ? detail.sectionGuidance.evidence.recommendedAction
      : "Adds a new item to this work package immediately.";

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Supporting Documents & Supporting Information</h3>
          <p className="mt-1 text-sm text-slate-500">Status: {detail.evidenceState.replaceAll("_", " ")}</p>
          <p className="mt-2 text-sm text-slate-600">{detail.sectionGuidance.evidence.recommendedAction}</p>
          {!detail.availableActions.addEvidence && !detail.availableActions.reviewEvidence ? (
            <p className="mt-2 text-xs text-slate-500">This role can view evidence only.</p>
          ) : null}
        </div>
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
          {canAddItem ? "Primary action" : "Unavailable"}
        </p>
        <p className="mt-1 text-xs text-slate-500">{addItemHelp}</p>
      </div>

      <div className="mt-3 grid gap-3">
        {detail.evidence.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-4 ${
              detail.availableActions.reviewEvidence ? "border-slate-900/10 bg-slate-50" : "border-slate-200 bg-white"
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
                    disabled={!detail.availableActions.reviewEvidence}
                    className={`disabled:cursor-not-allowed ${
                      getActionButtonClass(status === "accepted" ? "primary" : "secondary", !detail.availableActions.reviewEvidence)
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            {detail.availableActions.reviewEvidence ? (
              <p className="mt-2 text-sm text-slate-600">Primary action: accept when the evidence is complete. Use the other controls when review cannot clear yet.</p>
            ) : null}
            {!detail.availableActions.reviewEvidence ? (
              <p className="mt-2 text-sm text-slate-600">{detail.availableActions.reviewEvidenceReason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
