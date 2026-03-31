"use client";

import React, { useEffect, useMemo, useState } from "react";
import NotificationCenter from "./NotificationCenter";
import { badgePatterns, buttonPatterns, inputPatterns, layoutPatterns, surfacePatterns, typographyScale } from "@/lib/designSystem";
import {
  type ApprovalRole,
  type ContractRecord,
  type NotificationRecord,
  type NotificationStatus,
  type QueueActionExecutionResult,
  type QueueActionKey,
  type StageRecord,
  useStageStore,
} from "@/lib/stageStore";
import {
  deriveMobileActionInbox,
  deriveReleaseControlModel,
  deriveReleaseStageDecision,
  type FundingPosition,
  type MobileOperationsRole,
} from "@/lib/systemState";

type MobileOperationsPanelProps = {
  contracts: ContractRecord[];
  funding: FundingPosition;
  notifications: NotificationRecord[];
  selectedProjectId: string;
  onPostAction: (payload: {
    message: string;
    stageId: string | null;
    nextActionKey: QueueActionKey | null;
  }) => void;
  onUpdateNotificationStatus: (notificationId: string, status: NotificationStatus) => void;
};

type EvidenceDraft = {
  stageId: string;
  evidenceName: string;
  evidenceType: string;
  uploadPlaceholder: string;
  note: string;
};

const mobileRoleOptions: Array<{ value: MobileOperationsRole; label: string }> = [
  { value: "delivery", label: "Delivery" },
  { value: "professional", label: "Professional" },
  { value: "commercial", label: "Commercial" },
  { value: "treasury", label: "Treasury" },
];

const panelCardClass = `${surfacePatterns.shell} p-4`;
const itemCardClass = `${surfacePatterns.interactive} px-4 py-4`;
const footerRowClass = layoutPatterns.cardFooterRow;

export default function MobileOperationsPanel({
  contracts,
  funding,
  notifications,
  selectedProjectId,
  onPostAction,
  onUpdateNotificationStatus,
}: MobileOperationsPanelProps) {
  const {
    canSubmitStageCompletion,
    executeQueueAction,
    getContractById,
    reviewStageApproval,
    stages,
    submitMobileEvidence,
    submitStageCompletion,
  } = useStageStore();
  const [mobileRole, setMobileRole] = useState<MobileOperationsRole>("delivery");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>({
    stageId: "",
    evidenceName: "",
    evidenceType: "photo",
    uploadPlaceholder: "",
    note: "",
  });

  const projectStages = stages.filter((stage) => getContractById(stage.contractId)?.projectId === selectedProjectId);
  const releaseControl = deriveReleaseControlModel(projectStages, funding);
  const mobileInbox = deriveMobileActionInbox(releaseControl, mobileRole);
  const deliveryStages = projectStages.filter((stage) => stage.lifecycle !== "archived" && stage.lifecycle !== "rejected");
  const selectedStage = projectStages.find((stage) => stage.id === selectedStageId) ?? deliveryStages[0] ?? null;
  const approvalCards = mobileInbox.filter((item) => item.type === "approval");

  useEffect(() => {
    if ((!selectedStageId || !deliveryStages.some((stage) => stage.id === selectedStageId)) && deliveryStages[0]) {
      setSelectedStageId(deliveryStages[0].id);
      setEvidenceDraft((current) => ({ ...current, stageId: deliveryStages[0].id }));
    }
  }, [deliveryStages, selectedStageId]);

  useEffect(() => {
    if (!selectedStage) {
      return;
    }

    setEvidenceDraft((current) => ({
      ...current,
      stageId: selectedStage.id,
      evidenceName: current.evidenceName || selectedStage.requiredEvidence[0] || `${selectedStage.name} evidence`,
    }));
  }, [selectedStage]);

  const selectedStageDecision = useMemo(
    () => (selectedStage ? deriveReleaseStageDecision(selectedStage, funding) : null),
    [funding, selectedStage],
  );

  const handleResult = (result: QueueActionExecutionResult) => {
    const nextActionKey = result.postActionState?.nextActions[0]?.actionKey ?? null;
    const stageId = result.postActionState?.primaryStageId ?? null;

    setLocalMessage(result.message);
    window.setTimeout(() => setLocalMessage(null), 2500);
    onPostAction({
      message: result.message,
      stageId,
      nextActionKey,
    });
  };

  const submitEvidence = () => {
    if (!selectedStage) {
      return;
    }

    handleResult(
      submitMobileEvidence(selectedStage.id, {
        evidenceName: evidenceDraft.evidenceName,
        evidenceType: evidenceDraft.evidenceType,
        uploadPlaceholder: evidenceDraft.uploadPlaceholder || "mobile-upload-placeholder.jpg",
        note: evidenceDraft.note,
        submittedBy: "Delivery Mobile User",
      }),
    );
  };

  const submitCompletion = () => {
    if (!selectedStage) {
      return;
    }

    handleResult(submitStageCompletion(selectedStage.id));
  };

  const handleApproval = (stageId: string, role: ApprovalRole, action: "approve" | "reject" | "request-more") => {
    handleResult(reviewStageApproval(stageId, role, action));
  };

  const handleInboxAction = (actionKey: QueueActionKey, stageId?: string) => {
    handleResult(executeQueueAction(actionKey, stageId));
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-10">
      <div className="rounded-[28px] border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={typographyScale.sectionTitle}>Mobile Operations</h2>
            <p className={typographyScale.helper}>Mobile-first delivery, completion, and approval workflow tied to the shared release engine.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {mobileRoleOptions.map((option) => (
              <button
                key={option.value}
                className={`${buttonPatterns.pill} ${
                  mobileRole === option.value ? "bg-blue-700 text-white" : "bg-neutral-800 text-neutral-300"
                }`}
                onClick={() => setMobileRole(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {localMessage ? (
          <div className="mt-4 rounded-2xl border border-blue-700 bg-blue-950/60 px-4 py-3 text-sm font-medium text-blue-200">
            {localMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className={panelCardClass}>
              <div className="flex items-center justify-between gap-3">
                <h3 className={typographyScale.cardTitle}>Mobile Action Inbox</h3>
                <span className="text-xs text-neutral-500">{mobileInbox.length} action(s)</span>
              </div>
              <div className="mt-4 space-y-3">
                {mobileInbox.length === 0 ? (
                  <div className="rounded-2xl bg-neutral-950/80 px-4 py-4 text-sm text-neutral-400">No mobile actions pending for this role.</div>
                ) : (
                  mobileInbox.map((action) => (
                    <div key={action.id} className={itemCardClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-100">{action.stageName ?? action.title}</div>
                        </div>
                        <span className={badgePatterns.neutral}>
                          {action.type}
                        </span>
                      </div>
                      <div className="text-2xl font-black tracking-tight text-neutral-50">{action.requiredRole ? action.requiredRole : action.owner}</div>
                      <div className="text-xs text-neutral-400">{action.blockerLabel ?? action.detail}</div>
                      <div className={footerRowClass}>
                        <button className={buttonPatterns.primary} onClick={() => handleInboxAction(action.actionKey, action.stageId)}>
                          {action.type === "completion" ? "Submit completion" : "Open action"}
                        </button>
                        <span>{action.priority}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {mobileRole === "delivery" ? (
              <div className={panelCardClass}>
                <h3 className="text-base font-semibold text-neutral-100">Delivery Evidence Submission</h3>
                <div className="mt-4 space-y-4">
                  <label className="block text-sm text-neutral-300">
                    Stage
                    <select
                      className={inputPatterns.mobileSelect}
                      value={selectedStage?.id ?? ""}
                      onChange={(event) => {
                        setSelectedStageId(event.target.value);
                        setEvidenceDraft((current) => ({ ...current, stageId: event.target.value }));
                      }}
                    >
                      {deliveryStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-neutral-300">
                    Evidence type
                    <select
                      className={inputPatterns.mobileSelect}
                      value={evidenceDraft.evidenceType}
                      onChange={(event) => setEvidenceDraft((current) => ({ ...current, evidenceType: event.target.value }))}
                    >
                      <option value="photo">Photo</option>
                      <option value="certificate">Certificate</option>
                      <option value="inspection">Inspection</option>
                      <option value="invoice">Invoice</option>
                      <option value="delivery_note">Delivery note</option>
                    </select>
                  </label>
                  <label className="block text-sm text-neutral-300">
                    Evidence item
                    <select
                      className="mt-1 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100"
                      value={evidenceDraft.evidenceName}
                      onChange={(event) => setEvidenceDraft((current) => ({ ...current, evidenceName: event.target.value }))}
                    >
                      {(selectedStage?.requiredEvidence ?? []).map((itemName) => (
                        <option key={itemName} value={itemName}>{itemName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-neutral-300">
                    Upload placeholder
                    <input
                      className="mt-1 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100"
                      placeholder="site-setup-photo.jpg"
                      value={evidenceDraft.uploadPlaceholder}
                      onChange={(event) => setEvidenceDraft((current) => ({ ...current, uploadPlaceholder: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm text-neutral-300">
                    Notes
                    <textarea
                      className="mt-1 w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100"
                      rows={3}
                      placeholder="Add a delivery note for the reviewer"
                      value={evidenceDraft.note}
                      onChange={(event) => setEvidenceDraft((current) => ({ ...current, note: event.target.value }))}
                    />
                  </label>
                  <button
                    className="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                    onClick={submitEvidence}
                    disabled={!selectedStage}
                  >
                    Submit evidence
                  </button>
                </div>
              </div>
            ) : (
              <div className={panelCardClass}>
                <h3 className="text-base font-semibold text-neutral-100">Pending Approval Actions</h3>
                <div className="mt-4 space-y-3">
                  {approvalCards.length === 0 ? (
                    <div className="rounded-2xl bg-neutral-950/80 px-4 py-4 text-sm text-neutral-400">No approval items are pending for this role.</div>
                  ) : (
                    approvalCards.map((action) => (
                      <div key={action.id} className={itemCardClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-neutral-100">{action.stageName}</div>
                          <span className="rounded-full bg-neutral-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                            {action.requiredRole}
                          </span>
                        </div>
                        <div className="text-2xl font-black tracking-tight text-neutral-50">{action.title}</div>
                        <div className="text-xs text-neutral-400">{action.blockerLabel ?? action.detail}</div>
                        <div className={footerRowClass}>
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800" onClick={() => handleApproval(action.stageId!, action.requiredRole as ApprovalRole, "approve")}>Approve</button>
                            <button className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800" onClick={() => handleApproval(action.stageId!, action.requiredRole as ApprovalRole, "reject")}>Reject</button>
                            <button className="rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800" onClick={() => handleApproval(action.stageId!, action.requiredRole as ApprovalRole, "request-more")}>Request more</button>
                          </div>
                          <span>{action.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <h3 className="text-base font-semibold text-neutral-100">Selected Stage</h3>
              {selectedStage ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold text-neutral-100">{selectedStage.name}</span>
                    <span className="rounded-full bg-neutral-800 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                      {selectedStage.lifecycle}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-neutral-400">
                    <div>Evidence: <span className="text-neutral-100">{selectedStage.evidenceStatus}</span></div>
                    <div>Completion: <span className="text-neutral-100">{selectedStage.completionState}</span></div>
                    <div>Funding: <span className="text-neutral-100">{selectedStage.fundingStatus}</span></div>
                    <div>Approvals: <span className="text-neutral-100">{selectedStage.requiredApprovers.join(", ")}</span></div>
                  </div>
                  <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Release Status</div>
                    <div className="mt-2 text-sm text-neutral-100">
                      {selectedStageDecision?.releasable ? "Releasable" : selectedStageDecision?.state === "blocked" ? "Blocked" : "Attention required"}
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-neutral-400">
                      {(selectedStageDecision?.blockers ?? []).map((blocker) => (
                        <li key={blocker.code}>
                          {blocker.label}
                          {blocker.nextRequiredRole ? ` · ${blocker.nextRequiredRole}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-neutral-950/70 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Evidence Items</div>
                    <div className="mt-3 space-y-2">
                      {selectedStage.evidenceItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-neutral-800 px-3 py-3 text-xs">
                          <div className="font-semibold text-neutral-100">{item.name}</div>
                          <div className="mt-1 text-neutral-400">
                            {item.status} · {item.submissionState}
                            {item.uploadPlaceholder ? ` · ${item.uploadPlaceholder}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {mobileRole === "delivery" ? (
                    <button
                      className="w-full rounded-2xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={submitCompletion}
                      disabled={!canSubmitStageCompletion(selectedStage)}
                    >
                      Submit stage completion
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 text-sm text-neutral-400">Select a stage from the delivery view to manage evidence and completion.</div>
              )}
            </div>

            <NotificationCenter
              key={`mobile-notifications-${mobileRole}`}
              notifications={notifications}
              contracts={contracts}
              stages={projectStages}
              onUpdateStatus={onUpdateNotificationStatus}
              defaultRoleFilter={mobileRole}
              compact
            />
          </div>
        </div>
      </div>
    </section>
  );
}
