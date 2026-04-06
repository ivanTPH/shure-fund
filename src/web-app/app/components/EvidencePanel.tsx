import type { EvidenceStatus, EvidenceType } from "@/lib/shureFundModels";
import type { StageDetailModel } from "@/lib/systemState";

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
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Supporting Documents & Supporting Information</h3>
          <p className="mt-1 text-sm text-slate-500">Status: {detail.evidenceState.replaceAll("_", " ")}</p>
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
            disabled={!detail.availableActions.addEvidence}
            className="min-h-12 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Add Item
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        {detail.evidence.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.type === "file" ? "Supporting Document" : "Supporting Information"} · {item.record?.status ?? "missing"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {(["pending", "accepted", "rejected", "requires_more"] as EvidenceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onUpdateEvidenceStatus(item.id, status)}
                    className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
