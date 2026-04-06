import type { ApprovalRole, EvidenceStatus, EvidenceType, FundingSourceType } from "@/lib/shureFundModels";
import { getStageDecisionPack, type StageDetailModel } from "@/lib/systemState";

import ApprovalPanel from "./ApprovalPanel";
import EvidencePanel from "./EvidencePanel";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

type StageDetailPanelProps = {
  detail: StageDetailModel;
  overrideReason: string;
  evidenceTitle: string;
  evidenceType: EvidenceType;
  fundingSource: FundingSourceType | "";
  disputeTitle: string;
  disputeReason: string;
  disputeAmount: string;
  variationTitle: string;
  variationReason: string;
  variationAmount: string;
  onOverrideReasonChange: (value: string) => void;
  onEvidenceTitleChange: (value: string) => void;
  onEvidenceTypeChange: (value: EvidenceType) => void;
  onDisputeTitleChange: (value: string) => void;
  onDisputeReasonChange: (value: string) => void;
  onDisputeAmountChange: (value: string) => void;
  onVariationTitleChange: (value: string) => void;
  onVariationReasonChange: (value: string) => void;
  onVariationAmountChange: (value: string) => void;
  onAddEvidence: () => void;
  onUpdateEvidenceStatus: (requirementId: string, status: EvidenceStatus) => void;
  onApprove: (role: ApprovalRole) => void;
  onReject: (role: ApprovalRole) => void;
  onFundStage: () => void;
  onApplyOverride: () => void;
  onRelease: () => void;
  onOpenDispute: () => void;
  onResolveDispute: (disputeId: string) => void;
  onCreateVariation: () => void;
  onApproveVariation: (variationId: string) => void;
  onRejectVariation: (variationId: string) => void;
  onActivateVariation: (variationId: string) => void;
};

export default function StageDetailPanel({
  detail,
  overrideReason,
  evidenceTitle,
  evidenceType,
  fundingSource,
  disputeTitle,
  disputeReason,
  disputeAmount,
  variationTitle,
  variationReason,
  variationAmount,
  onOverrideReasonChange,
  onEvidenceTitleChange,
  onEvidenceTypeChange,
  onDisputeTitleChange,
  onDisputeReasonChange,
  onDisputeAmountChange,
  onVariationTitleChange,
  onVariationReasonChange,
  onVariationAmountChange,
  onAddEvidence,
  onUpdateEvidenceStatus,
  onApprove,
  onReject,
  onFundStage,
  onApplyOverride,
  onRelease,
  onOpenDispute,
  onResolveDispute,
  onCreateVariation,
  onApproveVariation,
  onRejectVariation,
  onActivateVariation,
}: StageDetailPanelProps) {
  const decisionPack = getStageDecisionPack(detail);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Work Package Detail</h2>
        <p className="mt-1 text-sm text-slate-500">{detail.projectName} · {detail.stage.name}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Certified Value</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(detail.certifiedValue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Undisputed Value</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(detail.disputeSummary.undisputedValue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Frozen</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Workflow Status</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{detail.operationalStatus.label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.operationalStatus.reason}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Funding</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.fundingState === "funded" ? "Ready" : "Funding blocked"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Evidence</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.evidenceState === "accepted" ? "Ready" : "Awaiting evidence"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Approval</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {detail.approvalState === "approved" ? "Ready" : "Awaiting approval"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Control Summary</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Approvals</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.approvalState === "approved" ? "Ready" : "Awaiting approval"}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Evidence</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.evidenceState === "accepted" ? "Ready" : "Awaiting evidence"}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Funding</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.fundingState === "funded" ? "Ready" : "Funding blocked"}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Dispute</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.disputeSummary.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Variation</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.variationSummary.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Treasury</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{detail.treasuryReadiness.label}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Decision Pack</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.status}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Treasury readiness</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.treasuryReadiness}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Release status</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.releaseStatus}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Next owner</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.nextActionOwner}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Releasable</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.releasable)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Frozen</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.frozen)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Blocked</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{currency.format(decisionPack.blocked)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <p className="text-xs text-slate-500">Principal blocker</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{decisionPack.principalBlocker}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Shortest Path Forward</p>
          <p className="mt-2 text-sm text-slate-600">{detail.operationalStatus.nextStep}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Release Decision</p>
          <p className="mt-2 text-sm font-medium text-slate-950">{detail.releaseDecision.explanation.label}</p>
          <p className="mt-1 text-sm text-slate-600">{detail.releaseDecision.explanation.reason}</p>
          <p className="mt-2 text-xs text-slate-500">
            Releasable {currency.format(detail.releaseDecision.releasableAmount)} · Frozen {currency.format(detail.releaseDecision.frozenAmount)} · Blocked {currency.format(detail.releaseDecision.blockedAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Decision basis: {detail.releaseDecision.explanation.decisionBasis}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.treasuryReadiness.label} · {detail.treasuryReadiness.reason}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Funding</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Stage Value</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.certifiedValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Current certified value for this Work Package.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Releasable</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.releaseDecision.releasableAmount)}</p>
            <p className="mt-1 text-xs text-slate-500">Value available to release now.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Frozen</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{currency.format(detail.disputeSummary.frozenValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Held outside drawdown.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Funding Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.fundingStatusLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Based on allocated funds against this Work Package requirement.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Allocated for WIP</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.contributesToRequiredCover ? "Included" : "Cleared"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {detail.contributesToRequiredCover
                ? "This Work Package still contributes to Allocated for WIP."
                : "This Work Package no longer adds to Allocated for WIP."}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm text-slate-500">Blocking Release</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{detail.blockingRelease ? "Yes" : "No"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {detail.blockingRelease
                ? "One or more current blockers in the release decision are stopping drawdown."
                : "This Work Package is not currently blocked from drawdown."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Dispute Position</p>
            <p className="mt-2 text-sm text-slate-600">{detail.disputeSummary.reason}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Disputed value: {currency.format(detail.disputeSummary.disputedValue)}</p>
              <p>Frozen value: {currency.format(detail.disputeSummary.frozenValue)}</p>
              <p>Undisputed value: {currency.format(detail.disputeSummary.undisputedValue)}</p>
              <p>Releasable value: {currency.format(detail.disputeSummary.releasableValue)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Variation Position</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{detail.variationSummary.status}</p>
            <p className="mt-1 text-sm text-slate-600">{detail.variationSummary.reason}</p>
          </div>
        </div>

        {detail.blockingRelease ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Current blockers</p>
            <div className="mt-2 grid gap-2">
              {detail.releaseDecision.reasons.map((reason, index) => (
                <p key={`release-blocker-${reason.type}-${index}`} className="text-sm text-amber-900">
                  {reason.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Drawdown Decision</p>
        <div className="mt-2 grid gap-2">
          <p className="text-sm text-slate-600">{detail.releaseDecision.explanation.reason}</p>
          <p className="text-sm text-slate-600">
            {detail.releaseDecision.isPartialRelease
              ? `Only ${currency.format(detail.releaseDecision.releasableAmount)} can release now. ${currency.format(detail.releaseDecision.frozenAmount)} remains frozen.`
              : `Release amount available now: ${currency.format(detail.releaseDecision.releasableAmount)}.`}
          </p>
          <p className="text-sm text-slate-600">Decision basis: {detail.releaseDecision.explanation.decisionBasis}</p>
          {detail.releaseDecision.overridden ? (
            <p className="rounded-2xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
              Treasury override is active and clearly flagged. Drawdown proceeds as an override, not a normal release.
            </p>
          ) : null}
          {detail.releaseDecision.reasons.map((reason, index) => (
            <p key={`${reason.type}-${index}`} className="text-sm text-slate-600">
              <span className="font-medium capitalize text-slate-800">{reason.type.replaceAll("_", " ")}:</span> {reason.message}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onFundStage}
          disabled={!detail.availableActions.fundStage}
          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          Fund Work Package
        </button>
        <button
          type="button"
          onClick={onRelease}
          disabled={!detail.availableActions.release}
          className="min-h-12 rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Drawdown
        </button>
        <button
          type="button"
          onClick={onApplyOverride}
          disabled={!detail.availableActions.applyOverride}
          className="min-h-12 rounded-2xl bg-teal-700 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-teal-200"
        >
          Apply Override
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-teal-200 bg-teal-50 p-4">
        <p className="text-sm font-semibold text-teal-950">Treasury Override</p>
        <p className="mt-1 text-xs text-teal-900">Funding source in view: {fundingSource || "not selected"}</p>
        <textarea
          className="mt-3 min-h-24 w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm"
          placeholder="Override reason"
          value={overrideReason}
          onChange={(event) => onOverrideReasonChange(event.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <EvidencePanel
          detail={detail}
          evidenceTitle={evidenceTitle}
          evidenceType={evidenceType}
          onEvidenceTitleChange={onEvidenceTitleChange}
          onEvidenceTypeChange={onEvidenceTypeChange}
          onAddEvidence={onAddEvidence}
          onUpdateEvidenceStatus={onUpdateEvidenceStatus}
        />
        <ApprovalPanel detail={detail} onApprove={onApprove} onReject={onReject} />
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Disputes</h3>
            <p className="mt-1 text-sm text-slate-500">Freeze only the affected value while undisputed value can continue through control checks.</p>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Dispute title"
              value={disputeTitle}
              onChange={(event) => onDisputeTitleChange(event.target.value)}
            />
            <textarea
              className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Reason for dispute"
              value={disputeReason}
              onChange={(event) => onDisputeReasonChange(event.target.value)}
            />
            <input
              inputMode="numeric"
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Frozen value amount"
              value={disputeAmount}
              onChange={(event) => onDisputeAmountChange(event.target.value)}
            />
            <button
              type="button"
              onClick={onOpenDispute}
              disabled={!detail.availableActions.openDispute}
              className="min-h-12 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Raise Dispute
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {detail.disputes.map((dispute) => (
              <article key={dispute.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{dispute.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{dispute.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Disputed {currency.format(dispute.disputedAmount)} · {dispute.status}
                    </p>
                  </div>
                  {dispute.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => onResolveDispute(dispute.id)}
                      disabled={!dispute.canResolve}
                      className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {detail.disputes.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No dispute items recorded for this Work Package.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Variations</h3>
            <p className="mt-1 text-sm text-slate-500">Variations must be reviewed and funding-confirmed before activation.</p>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Variation title"
              value={variationTitle}
              onChange={(event) => onVariationTitleChange(event.target.value)}
            />
            <textarea
              className="min-h-24 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Reason for variation"
              value={variationReason}
              onChange={(event) => onVariationReasonChange(event.target.value)}
            />
            <input
              inputMode="numeric"
              className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Variation amount delta"
              value={variationAmount}
              onChange={(event) => onVariationAmountChange(event.target.value)}
            />
            <button
              type="button"
              onClick={onCreateVariation}
              disabled={!detail.availableActions.createVariation}
              className="min-h-12 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Propose Variation
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {detail.variations.map((variation) => (
              <article key={variation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{variation.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{variation.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Delta {currency.format(variation.amountDelta)} · {variation.operationalStatusLabel}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:flex">
                    {variation.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApproveVariation(variation.id)}
                          disabled={!variation.canApprove}
                          className="min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Approve Variation
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectVariation(variation.id)}
                          disabled={!variation.canReject}
                          className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {variation.status === "approved" ? (
                      <button
                        type="button"
                        onClick={() => onActivateVariation(variation.id)}
                        disabled={!variation.canActivate}
                        className="min-h-11 rounded-2xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-teal-200"
                      >
                        Activate
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {detail.variations.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No variations recorded for this Work Package.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-900">Blockers</h3>
        <div className="mt-3 grid gap-3">
          {detail.blockers.map((blocker) => (
            <article key={blocker.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">{blocker.label}</p>
              <p className="mt-1 text-sm text-slate-500">{blocker.priority}</p>
            </article>
          ))}
          {detail.blockers.length === 0 ? (
            <p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">No blockers recorded for this Work Package.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
