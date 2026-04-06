"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import type {
  AdministrationLifecycleState,
  ApprovalRole,
  ContractRecord,
  StageDisputeState,
  StageFundingStatus,
  StageRecord,
  StageVariationState,
} from "@/lib/stageStore";
import type { ContractAdministrationSummaryItem } from "@/lib/systemState";

type ContractDraft = {
  projectIdentity: string;
  title: string;
  summary: string;
  employerName: string;
  deliveryPartnerName: string;
  funderName: string;
  administratorName: string;
  totalValue: string;
  allocatedFunding: string;
  fundingModel: ContractRecord["fundingStructure"]["model"];
  reserveHeld: string;
  releaseRule: string;
  signOffMode: ContractRecord["signOffModel"]["mode"];
  requiredRoles: ApprovalRole[];
  lifecycle: AdministrationLifecycleState;
};

type StageDraft = {
  name: string;
  plannedStart: string;
  plannedEnd: string;
  value: string;
  requiredEvidence: string;
  requiredApprovers: ApprovalRole[];
  lifecycle: AdministrationLifecycleState;
  fundingStatus: StageFundingStatus;
  disputeState: StageDisputeState;
  variationState: StageVariationState;
};

type ContractAdministrationPanelProps = {
  summaries: ContractAdministrationSummaryItem[];
  selectedContractId: string | null;
  selectedStageId: string | null;
  onSelectContract: (contractId: string | null) => void;
  onSelectStage: (stageId: string | null) => void;
  onCreateContract: (draft: ContractDraft) => void;
  onUpdateContract: (contractId: string, draft: ContractDraft) => void;
  onAmendContract: (contractId: string, summary: string) => void;
  onResubmitContract: (contractId: string) => void;
  onSetContractLifecycle: (contractId: string, lifecycle: AdministrationLifecycleState) => void;
  onCreateStage: (contractId: string, draft: StageDraft) => void;
  onUpdateStage: (stageId: string, draft: StageDraft) => void;
  onAmendStage: (stageId: string, summary: string) => void;
  onResubmitStage: (stageId: string) => void;
};

const emptyContractDraft: ContractDraft = {
  projectIdentity: "",
  title: "",
  summary: "",
  employerName: "",
  deliveryPartnerName: "",
  funderName: "",
  administratorName: "",
  totalValue: "",
  allocatedFunding: "",
  fundingModel: "escrow",
  reserveHeld: "",
  releaseRule: "",
  signOffMode: "sequential",
  requiredRoles: ["professional", "commercial", "treasury"],
  lifecycle: "draft",
};

const emptyStageDraft: StageDraft = {
  name: "",
  plannedStart: "",
  plannedEnd: "",
  value: "",
  requiredEvidence: "",
  requiredApprovers: ["professional", "commercial", "treasury"],
  lifecycle: "draft",
  fundingStatus: "unfunded",
  disputeState: "none",
  variationState: "none",
};

function mapContractToDraft(contract: ContractRecord): ContractDraft {
  const employer = contract.parties.find((party) => party.role === "employer")?.name ?? "";
  const deliveryPartner = contract.parties.find((party) => party.role === "delivery-partner")?.name ?? "";
  const funder = contract.parties.find((party) => party.role === "funder")?.name ?? "";
  const administrator = contract.parties.find((party) => party.role === "administrator")?.name ?? "";

  return {
    projectIdentity: contract.projectIdentity,
    title: contract.title,
    summary: contract.summary,
    employerName: employer,
    deliveryPartnerName: deliveryPartner,
    funderName: funder,
    administratorName: administrator,
    totalValue: String(contract.totalValue),
    allocatedFunding: String(contract.allocatedFunding),
    fundingModel: contract.fundingStructure.model,
    reserveHeld: String(contract.fundingStructure.reserveHeld),
    releaseRule: contract.fundingStructure.releaseRule,
    signOffMode: contract.signOffModel.mode,
    requiredRoles: contract.signOffModel.requiredRoles,
    lifecycle: contract.lifecycle,
  };
}

function mapStageToDraft(stage: StageRecord): StageDraft {
  return {
    name: stage.name,
    plannedStart: stage.plannedStart,
    plannedEnd: stage.plannedEnd,
    value: String(stage.value),
    requiredEvidence: stage.requiredEvidence.join(", "),
    requiredApprovers: stage.requiredApprovers,
    lifecycle: stage.lifecycle,
    fundingStatus: stage.fundingStatus,
    disputeState: stage.disputeState,
    variationState: stage.variationState,
  };
}

function roleToggle(list: ApprovalRole[], role: ApprovalRole) {
  return list.includes(role) ? list.filter((item) => item !== role) : [...list, role];
}

export default function ContractAdministrationPanel({
  summaries,
  selectedContractId,
  selectedStageId,
  onSelectContract,
  onSelectStage,
  onCreateContract,
  onUpdateContract,
  onAmendContract,
  onResubmitContract,
  onSetContractLifecycle,
  onCreateStage,
  onUpdateStage,
  onAmendStage,
  onResubmitStage,
}: ContractAdministrationPanelProps) {
  const [contractDraft, setContractDraft] = useState<ContractDraft>(emptyContractDraft);
  const [stageDraft, setStageDraft] = useState<StageDraft>(emptyStageDraft);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [contractAmendmentSummary, setContractAmendmentSummary] = useState("");
  const [stageAmendmentSummary, setStageAmendmentSummary] = useState("");

  const selectedContractSummary =
    summaries.find((summary) => summary.contract.id === selectedContractId) ?? summaries[0] ?? null;
  const selectedContract = selectedContractSummary?.contract ?? null;
  const selectedStage =
    selectedContractSummary?.stages.find((stage) => stage.id === selectedStageId) ??
    selectedContractSummary?.stages[0] ??
    null;

  useEffect(() => {
    if (isCreatingContract) {
      setContractDraft(emptyContractDraft);
      return;
    }

    if (selectedContract) {
      setContractDraft(mapContractToDraft(selectedContract));
    }
  }, [isCreatingContract, selectedContract]);

  useEffect(() => {
    if (isCreatingStage) {
      setStageDraft(emptyStageDraft);
      return;
    }

    if (selectedStage) {
      setStageDraft(mapStageToDraft(selectedStage));
    }
  }, [isCreatingStage, selectedStage]);

  useEffect(() => {
    if (!selectedContractId && selectedContractSummary) {
      onSelectContract(selectedContractSummary.contract.id);
    }
  }, [onSelectContract, selectedContractId, selectedContractSummary]);

  useEffect(() => {
    if (!selectedStageId && selectedStage) {
      onSelectStage(selectedStage.id);
    }
  }, [onSelectStage, selectedStage, selectedStageId]);

  const submitContract = () => {
    if (isCreatingContract || !selectedContract) {
      onCreateContract(contractDraft);
      setIsCreatingContract(false);
      return;
    }

    onUpdateContract(selectedContract.id, contractDraft);
  };

  const submitStage = () => {
    if (!selectedContract) {
      return;
    }

    if (isCreatingStage || !selectedStage) {
      onCreateStage(selectedContract.id, stageDraft);
      setIsCreatingStage(false);
      return;
    }

    onUpdateStage(selectedStage.id, stageDraft);
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-6 mt-10">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">Contract & Stage Administration</h2>
          <p className="text-sm text-neutral-400">Set up contracts, manage stage breakdowns, and control amendments with shared-state release recalculation.</p>
        </div>
        <button
          className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => {
            setIsCreatingContract(true);
            onSelectContract(null);
            onSelectStage(null);
          }}
        >
          New contract
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {summaries.map((summary) => (
              <button
                key={summary.contract.id}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedContract?.id === summary.contract.id
                    ? "border-blue-500 bg-blue-950/20"
                    : "border-neutral-800 bg-neutral-900/80 hover:border-neutral-700"
                }`}
                onClick={() => {
                  setIsCreatingContract(false);
                  setIsCreatingStage(false);
                  onSelectContract(summary.contract.id);
                  onSelectStage(summary.stages[0]?.id ?? null);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-neutral-100">{summary.contract.title}</span>
                  <span className="rounded-full bg-neutral-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                    {summary.contract.lifecycle}
                  </span>
                </div>
                <div className="mt-1 text-sm text-neutral-400">{summary.contract.projectIdentity}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-400">
                  <div>Stages: <span className="font-semibold text-neutral-200">{summary.stages.length}</span></div>
                  <div>Value: <span className="font-semibold text-neutral-200">£{summary.totalStageValue.toLocaleString("en-GB")}</span></div>
                  <div>Releasable: <span className="font-semibold text-green-300">{summary.releasableStages}</span></div>
                  <div>Blocked: <span className="font-semibold text-red-300">{summary.blockedStages}</span></div>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-neutral-100">{isCreatingContract ? "Create Contract" : "Contract Setup"}</h3>
              {selectedContract ? (
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800" onClick={() => onSetContractLifecycle(selectedContract.id, "active")}>Activate</button>
                  <button className="rounded-full border border-amber-700 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-950/40" onClick={() => onSetContractLifecycle(selectedContract.id, "rejected")}>Reject</button>
                  <button className="rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800" onClick={() => onSetContractLifecycle(selectedContract.id, "archived")}>Archive</button>
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-neutral-300">
                Project identity
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.projectIdentity} onChange={(e) => setContractDraft({ ...contractDraft, projectIdentity: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Contract title
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.title} onChange={(e) => setContractDraft({ ...contractDraft, title: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300 md:col-span-2">
                Summary
                <textarea className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" rows={3} value={contractDraft.summary} onChange={(e) => setContractDraft({ ...contractDraft, summary: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Employer
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.employerName} onChange={(e) => setContractDraft({ ...contractDraft, employerName: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Delivery partner
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.deliveryPartnerName} onChange={(e) => setContractDraft({ ...contractDraft, deliveryPartnerName: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Funder
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.funderName} onChange={(e) => setContractDraft({ ...contractDraft, funderName: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Administrator
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.administratorName} onChange={(e) => setContractDraft({ ...contractDraft, administratorName: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Total value
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.totalValue} onChange={(e) => setContractDraft({ ...contractDraft, totalValue: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Allocated funding
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.allocatedFunding} onChange={(e) => setContractDraft({ ...contractDraft, allocatedFunding: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Funding model
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.fundingModel} onChange={(e) => setContractDraft({ ...contractDraft, fundingModel: e.target.value as ContractDraft["fundingModel"] })}>
                  <option value="escrow">Escrow</option>
                  <option value="direct">Direct</option>
                  <option value="milestone">Milestone</option>
                </select>
              </label>
              <label className="text-sm text-neutral-300">
                Reserve held
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.reserveHeld} onChange={(e) => setContractDraft({ ...contractDraft, reserveHeld: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300 md:col-span-2">
                Release rule
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.releaseRule} onChange={(e) => setContractDraft({ ...contractDraft, releaseRule: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Sign-off model
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={contractDraft.signOffMode} onChange={(e) => setContractDraft({ ...contractDraft, signOffMode: e.target.value as ContractDraft["signOffMode"] })}>
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                </select>
              </label>
              <div className="text-sm text-neutral-300">
                Required approvers
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["professional", "commercial", "treasury"] as ApprovalRole[]).map((role) => (
                    <button
                      key={role}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        contractDraft.requiredRoles.includes(role)
                          ? "bg-blue-700 text-white"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                      onClick={() => setContractDraft({ ...contractDraft, requiredRoles: roleToggle(contractDraft.requiredRoles, role) })}
                      type="button"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" onClick={submitContract}>
                {isCreatingContract ? "Create contract" : "Save contract"}
              </button>
              {selectedContract ? (
                <>
                  <input
                    className="min-w-[240px] rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100"
                    placeholder="Amendment summary"
                    value={contractAmendmentSummary}
                    onChange={(e) => setContractAmendmentSummary(e.target.value)}
                  />
                  <button className="rounded-full border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950/40" onClick={() => onAmendContract(selectedContract.id, contractAmendmentSummary || "Administration amendment")}>
                    Amend
                  </button>
                  <button className="rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-950/40" onClick={() => onResubmitContract(selectedContract.id)}>
                    Resubmit
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-100">Stage Breakdown</h3>
                <p className="text-sm text-neutral-400">{selectedContract?.title ?? "Select a contract to manage stages."}</p>
              </div>
              <button
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setIsCreatingStage(true);
                  onSelectStage(null);
                }}
                disabled={!selectedContract}
              >
                New stage
              </button>
            </div>
            <div className="space-y-3">
              {(selectedContractSummary?.stages ?? []).map((stage) => (
                <button
                  key={stage.id}
                  className={`w-full rounded-xl border p-4 text-left ${
                    selectedStage?.id === stage.id ? "border-blue-500 bg-blue-950/20" : "border-neutral-800 bg-neutral-950/70"
                  }`}
                  onClick={() => {
                    setIsCreatingStage(false);
                    onSelectStage(stage.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-neutral-100">{stage.name}</span>
                    <span className="rounded-full bg-neutral-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">{stage.lifecycle}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-400">
                    <div>Value: <span className="text-neutral-200">£{stage.value.toLocaleString("en-GB")}</span></div>
                    <div>Funding: <span className="text-neutral-200">{stage.fundingStatus}</span></div>
                    <div>Dispute: <span className="text-neutral-200">{stage.disputeState}</span></div>
                    <div>Variation: <span className="text-neutral-200">{stage.variationState}</span></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">{isCreatingStage ? "Create Stage" : "Stage Detail & Controls"}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-neutral-300">
                Stage name
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.name} onChange={(e) => setStageDraft({ ...stageDraft, name: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Lifecycle
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.lifecycle} onChange={(e) => setStageDraft({ ...stageDraft, lifecycle: e.target.value as AdministrationLifecycleState })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="amended">Amended</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="text-sm text-neutral-300">
                Planned start
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.plannedStart} onChange={(e) => setStageDraft({ ...stageDraft, plannedStart: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Planned end
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.plannedEnd} onChange={(e) => setStageDraft({ ...stageDraft, plannedEnd: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Stage value
                <input className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.value} onChange={(e) => setStageDraft({ ...stageDraft, value: e.target.value })} />
              </label>
              <label className="text-sm text-neutral-300">
                Funding status
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.fundingStatus} onChange={(e) => setStageDraft({ ...stageDraft, fundingStatus: e.target.value as StageFundingStatus })}>
                  <option value="unfunded">Unfunded</option>
                  <option value="reserved">Reserved</option>
                  <option value="funded">Funded</option>
                </select>
              </label>
              <label className="text-sm text-neutral-300">
                Dispute state
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.disputeState} onChange={(e) => setStageDraft({ ...stageDraft, disputeState: e.target.value as StageDisputeState })}>
                  <option value="none">None</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <label className="text-sm text-neutral-300">
                Variation state
                <select className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" value={stageDraft.variationState} onChange={(e) => setStageDraft({ ...stageDraft, variationState: e.target.value as StageVariationState })}>
                  <option value="none">None</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </label>
              <label className="text-sm text-neutral-300 md:col-span-2">
                Required evidence
                <textarea className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" rows={3} value={stageDraft.requiredEvidence} onChange={(e) => setStageDraft({ ...stageDraft, requiredEvidence: e.target.value })} />
              </label>
              <div className="text-sm text-neutral-300 md:col-span-2">
                Required approvers
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["professional", "commercial", "treasury"] as ApprovalRole[]).map((role) => (
                    <button
                      key={role}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        stageDraft.requiredApprovers.includes(role)
                          ? "bg-blue-700 text-white"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                      onClick={() => setStageDraft({ ...stageDraft, requiredApprovers: roleToggle(stageDraft.requiredApprovers, role) })}
                      type="button"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" onClick={submitStage} disabled={!selectedContract}>
                {isCreatingStage ? "Create stage" : "Save stage"}
              </button>
              {selectedStage ? (
                <>
                  <input
                    className="min-w-[220px] rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100"
                    placeholder="Stage amendment summary"
                    value={stageAmendmentSummary}
                    onChange={(e) => setStageAmendmentSummary(e.target.value)}
                  />
                  <button className="rounded-full border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950/40" onClick={() => onAmendStage(selectedStage.id, stageAmendmentSummary || "Stage administration amendment")}>
                    Amend
                  </button>
                  <button className="rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-200 hover:bg-green-950/40" onClick={() => onResubmitStage(selectedStage.id)}>
                    Resubmit
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
