export type UnifiedWorkflowActionType =
  | "funding_block"
  | "evidence_required"
  | "dispute_active"
  | "approval_required"
  | "release_ready"
  | "info";

export type UnifiedFundingStatus = "clear" | "warning" | "blocked";
export type UnifiedDisputeStatus = "clear" | "open" | "responded" | "external_resolution";
export type UnifiedReleaseStatus = "blocked" | "ready" | "partial_released" | "released";

export type UnifiedDominantAction = {
  type: UnifiedWorkflowActionType;
  label: string;
  nextAction: string;
  blocked: boolean;
  priority: "critical" | "high" | "low";
  reason: string;
};

export type UnifiedWorkflowControl = {
  key: string;
  label: string;
  enabled: boolean;
  intent?: "primary" | "danger" | "neutral";
};

export type WorkflowSurfaceState = {
  id: string;
  title: string;
  dominantAction: string;
  nextAction: string;
  reason: string;
  requiredActor: string;
  status: string;
  value: number;
  primaryActions: UnifiedWorkflowControl[];
  secondaryActions: UnifiedWorkflowControl[];
  detailRows: Array<[string, string]>;
};

export type UnifiedStageLike = {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  stageStatus?: string;
  approvalStatus?: string;
  approvalState?: string;
  requiredApprovals?: string[];
  completedApprovals?: string[];
  requiredEvidence?: string[];
  submittedEvidence?: Array<{ type?: string }>;
  evidence?: unknown[];
  checklist?: Array<{ done?: boolean }>;
  dispute?: { isActive?: boolean; status?: string; reason?: string; affectedValue?: number };
  disputedValue?: number;
  disputedAmount?: number;
  disputeResponseSubmitted?: boolean;
  disputeResolvedExternally?: boolean;
  approvedValue?: number;
  value?: number;
  releasedValue?: number;
  projectedWip30Days?: number;
  wipRequired?: number;
  reserveBuffer?: number;
  ringfencedFunds?: number;
  allocatedFunds?: number;
  availableFunds?: number;
  fundingState?: string;
  fundingStatus?: string;
};

export type UnifiedContractLike = {
  id?: string;
  title?: string;
  name?: string;
  value?: number;
};

export type UnifiedProjectLike = {
  id?: string;
  name?: string;
  location?: string;
  totalValue?: number;
  fundingStatus?: string;
  fundingSummary?: string;
  actionCue?: string;
  contracts?: UnifiedStageLike[];
};

export function deriveStageState(
  stage: UnifiedStageLike = {},
  contract: UnifiedContractLike = {},
  project: UnifiedProjectLike = {},
  userRole = "",
) {
  const stageContext = getUnifiedStageContext(stage, contract, project);
  const evidenceStatus = deriveUnifiedEvidenceStatus(stage);
  const fundingContext = deriveUnifiedFundingAssuranceContext(stage);
  const disputeContext = deriveUnifiedDisputeContext(stage);
  const releaseContext = deriveUnifiedReleaseContext(stage, userRole);
  const approvalStatus = deriveUnifiedApprovalStatus(stage);

  const dominantAction: UnifiedDominantAction = (() => {
    if (fundingContext.fundingStatus === "blocked") {
      return {
        type: "funding_block",
        priority: "critical",
        label: "Funding shortfall",
        nextAction: "Resolve funding",
        blocked: true,
        reason: "Funding cover is insufficient for this stage.",
      };
    }

    if (evidenceStatus !== "clear") {
      return {
        type: "evidence_required",
        priority: "critical",
        label: "Evidence incomplete",
        nextAction: "Upload evidence",
        blocked: true,
        reason: "Required evidence is missing before this stage can complete.",
      };
    }

    if (disputeContext.disputeStatus === "open" || disputeContext.disputeStatus === "responded") {
      return {
        type: "dispute_active",
        priority: "high",
        label: "Dispute active",
        nextAction: "Respond to dispute",
        blocked: false,
        reason: stage.dispute?.reason || "Disputed value is isolated from release until reviewed.",
      };
    }

    if (approvalStatus !== "approved") {
      return {
        type: "approval_required",
        priority: "high",
        label: "Approval required",
        nextAction: "Approve stage",
        blocked: false,
        reason: "Approval chain is not complete.",
      };
    }

    if (releaseContext.remainingReleasableValue > 0 && releaseContext.releaseStatus !== "blocked") {
      return {
        type: "release_ready",
        priority: "high",
        label: "Release ready",
        nextAction: "Confirm release",
        blocked: false,
        reason: "Approval, evidence, dispute, and funding gates are clear.",
      };
    }

    return {
      type: "info",
      priority: "low",
      label: "No action",
      nextAction: "",
      blocked: false,
      reason: "No workflow action is currently required.",
    };
  })();

  return {
    ...stageContext,
    ...fundingContext,
    ...disputeContext,
    ...releaseContext,
    evidenceStatus,
    approvalStatus,
    dominantAction,
  };
}

export function deriveAvailableWorkflowActions(stageState: ReturnType<typeof deriveStageState>, userRole = "") {
  const normalisedRole = userRole.toLowerCase().replace(/[\s-]+/g, "_");
  const canSubmitEvidence = ["contractor", "supplier", "submitter", "administrator"].some((role) => normalisedRole.includes(role));
  const canApprove = ["qs", "certifier", "client", "approver", "commercial", "administrator"].some((role) => normalisedRole.includes(role));
  const canRelease = ["treasury", "funder", "administrator"].some((role) => normalisedRole.includes(role));
  const canDispute = ["qs", "contractor", "client", "administrator", "treasury", "funder"].some((role) => normalisedRole.includes(role));
  const canEscalate = ["administrator", "client", "treasury", "funder"].some((role) => normalisedRole.includes(role));
  const canReassign = canEscalate;

  const primaryActions: UnifiedWorkflowControl[] = [];
  const secondaryActions: UnifiedWorkflowControl[] = [];
  let authorityLabel = "System";
  let blockedReason = stageState.dominantAction.blocked ? stageState.dominantAction.reason : undefined;

  if (stageState.dominantAction.type === "evidence_required") {
    authorityLabel = canSubmitEvidence ? "Contractor evidence submission" : "Contractor evidence submission required";
    primaryActions.push({
      key: canSubmitEvidence ? "upload_evidence" : "request_evidence",
      label: canSubmitEvidence ? "Upload evidence" : "Request evidence",
      enabled: true,
      intent: "primary",
    });
    secondaryActions.push({
      key: "view_checklist",
      label: "View checklist",
      enabled: true,
    });
  } else if (stageState.dominantAction.type === "funding_block" || (stageState.dominantAction.type === "info" && stageState.fundingStatus === "warning")) {
    authorityLabel = canRelease ? "Treasury funding authority" : "Treasury authority required";
    primaryActions.push({
      key: "review_funding",
      label: "Resolve funding",
      enabled: true,
      intent: "primary",
    });
    blockedReason = stageState.fundingStatus === "warning" ? "Funding cover is below the required reserve." : blockedReason;
  } else if (stageState.dominantAction.type === "dispute_active") {
    authorityLabel = canDispute ? "Dispute response authority" : "Authorised dispute response required";
    primaryActions.push({
      key: canDispute ? "respond_dispute" : "escalate",
      label: canDispute ? "Respond" : "Escalate",
      enabled: true,
      intent: "primary",
    });
    secondaryActions.push({
      key: "record_resolution",
      label: "Record resolution",
      enabled: canDispute,
    });
  } else if (stageState.dominantAction.type === "approval_required") {
    authorityLabel = canApprove ? "Commercial approval authority" : "Commercial approver required";
    primaryActions.push({
      key: "approve",
      label: "Approve",
      enabled: canApprove,
      intent: "primary",
    });
    secondaryActions.push(
      {
        key: "return",
        label: "Return",
        enabled: canApprove,
        intent: "danger",
      },
      {
        key: "clarify",
        label: "Clarify",
        enabled: true,
      },
    );
  } else if (stageState.dominantAction.type === "release_ready") {
    authorityLabel = canRelease ? "Treasury release authority" : "Treasury authority required";
    primaryActions.push({
      key: canRelease ? "confirm_release" : "notify_treasury",
      label: canRelease ? "Release payment" : "Notify treasury",
      enabled: true,
      intent: "primary",
    });
    secondaryActions.push({
      key: "review_release",
      label: "View release",
      enabled: true,
    });
  } else {
    authorityLabel = "System monitoring";
    secondaryActions.push({
      key: "mark_reviewed",
      label: "Mark reviewed",
      enabled: true,
    });
  }

  if (canEscalate && !secondaryActions.some((action) => action.key === "escalate")) {
    secondaryActions.push({
      key: "escalate",
      label: "Escalate",
      enabled: true,
    });
  }
  if (canReassign && !secondaryActions.some((action) => action.key === "reassign")) {
    secondaryActions.push({
      key: "reassign",
      label: "Reassign",
      enabled: true,
    });
  }

  return {
    reason: stageState.dominantAction.reason,
    authorityLabel,
    blockedReason,
    canApprove,
    canReturn: canApprove,
    canClarify: canApprove || canDispute,
    canUploadEvidence: canSubmitEvidence,
    canRelease: canRelease && stageState.dominantAction.type === "release_ready",
    canRespondToDispute: canDispute && stageState.dominantAction.type === "dispute_active",
    canEscalate,
    canReassign,
    primaryActions,
    secondaryActions,
  };
}

export function deriveContractWorkflowState(
  contract: UnifiedStageLike & UnifiedContractLike,
  project: UnifiedProjectLike = {},
  userRole = "",
): WorkflowSurfaceState {
  const stageState = deriveStageState(contract, contract, project, userRole);
  const actions = deriveAvailableWorkflowActions(stageState, userRole);
  const lifecycleState = deriveContractLifecycleSurface(contract, userRole);
  if (lifecycleState) {
    return {
      id: contract.id ?? "contract",
      title: contract.title ?? contract.name ?? "Contract",
      value: contract.value ?? stageState.approvedValue ?? 0,
      detailRows: [
        ["Project", project.name ?? "—"],
        ["Lifecycle", contract.status ?? "—"],
        ["Approval", stageState.approvalStatus],
        ["Funding", stageState.fundingStatus],
        ["Release", stageState.releaseStatus],
      ],
      ...lifecycleState,
    };
  }

  return {
    id: stageState.contractId ?? contract.id ?? "contract",
    title: stageState.contractName ?? contract.title ?? contract.name ?? "Contract",
    dominantAction: stageState.dominantAction.label,
    nextAction: stageState.dominantAction.nextAction || "No action",
    reason: actions.reason,
    requiredActor: actions.authorityLabel,
    status: deriveSurfaceStatus(stageState),
    value: contract.value ?? stageState.approvedValue ?? 0,
    primaryActions: actions.primaryActions,
    secondaryActions: actions.secondaryActions,
    detailRows: [
      ["Project", project.name ?? "—"],
      ["Stage", stageState.stageName ?? "—"],
      ["Evidence", stageState.evidenceStatus],
      ["Approval", stageState.approvalStatus],
      ["Funding", stageState.fundingStatus],
      ["Release", stageState.releaseStatus],
    ],
  };
}

function deriveContractLifecycleSurface(
  contract: UnifiedStageLike & UnifiedContractLike,
  userRole: string,
): Omit<WorkflowSurfaceState, "id" | "title" | "value" | "detailRows"> | null {
  const status = contract.status;
  const isController = /treasury|funder|administrator|commercial|owner|approver/i.test(userRole);
  if (status === "Draft") {
    return {
      dominantAction: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked" ? "Funding shortfall" : "Approval required",
      nextAction: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked" ? "Resolve funding or save draft" : "Issue contract",
      reason: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked"
        ? "Contract is draft because available ringfenced funding does not cover the contract value."
        : "Draft can be edited, issued, or cancelled before recipient acceptance.",
      requiredActor: isController ? "Project contract authority" : "Project owner required",
      status: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked" ? "blocked" : "pending",
      primaryActions: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked"
        ? [{ key: "review_funding", label: "Resolve funding", enabled: /treasury|funder|administrator/i.test(userRole), intent: "primary" as const }]
        : [{ key: "issue_contract", label: "Issue contract", enabled: isController, intent: "primary" as const }],
      secondaryActions: [
        { key: "save_draft", label: "Save draft", enabled: isController },
        { key: "cancel_contract", label: "Cancel", enabled: isController, intent: "danger" as const },
      ],
    };
  }
  if (status === "Issued" || status === "Sent") {
    return {
      dominantAction: "Approval required",
      nextAction: "Recipient acceptance required",
      reason: "Issued contract can be reassigned or cancelled only before recipient acceptance.",
      requiredActor: "Recipient / project owner",
      status: "pending",
      primaryActions: [{ key: "accept_contract", label: "Accept", enabled: true, intent: "primary" as const }],
      secondaryActions: [
        { key: "reassign", label: "Reassign", enabled: isController },
        { key: "cancel_contract", label: "Cancel", enabled: isController, intent: "danger" as const },
      ],
    };
  }
  if (status === "Accepted") {
    return {
      dominantAction: "Approval required",
      nextAction: "Activate contract",
      reason: "Accepted contract cannot be reassigned. It can become active once funding is clear.",
      requiredActor: "Project contract authority",
      status: "pending",
      primaryActions: [{ key: "activate_contract", label: "Activate", enabled: isController && contract.fundingState !== "Proof of funds pending" && contract.fundingState !== "Blocked", intent: "primary" as const }],
      secondaryActions: [{ key: "clarify", label: "Clarify", enabled: true }],
    };
  }
  if (status === "Returned") {
    return {
      dominantAction: "Approval required",
      nextAction: "Edit and reissue",
      reason: "Returned contract can be edited and reissued.",
      requiredActor: "Project contract authority",
      status: "pending",
      primaryActions: [{ key: "edit", label: "Edit", enabled: isController, intent: "primary" as const }],
      secondaryActions: [
        { key: "issue_contract", label: "Reissue", enabled: isController && contract.fundingState !== "Proof of funds pending" && contract.fundingState !== "Blocked" },
        { key: "cancel_contract", label: "Cancel", enabled: isController, intent: "danger" as const },
      ],
    };
  }
  if (status === "Rejected") {
    return {
      dominantAction: "Approval required",
      nextAction: "Cancel or duplicate draft",
      reason: "Rejected contract can be cancelled or duplicated as a new draft.",
      requiredActor: "Project contract authority",
      status: "blocked",
      primaryActions: [{ key: "duplicate_draft", label: "Duplicate draft", enabled: isController, intent: "primary" as const }],
      secondaryActions: [{ key: "cancel_contract", label: "Cancel", enabled: isController, intent: "danger" as const }],
    };
  }
  if (status === "Cancelled") {
    return {
      dominantAction: "No action",
      nextAction: "No action",
      reason: "Cancelled contract is read-only except audit and files.",
      requiredActor: "System monitoring",
      status: "clear",
      primaryActions: [],
      secondaryActions: [],
    };
  }
  if (status === "Completed" || status === "Released") {
    return {
      dominantAction: "No action",
      nextAction: "No action",
      reason: "Completed contract is read-only except audit and files.",
      requiredActor: "System monitoring",
      status: "clear",
      primaryActions: [],
      secondaryActions: [],
    };
  }
  return null;
}

export function deriveFundsWorkflowState(
  contract: UnifiedStageLike & UnifiedContractLike,
  project: UnifiedProjectLike = {},
  userRole = "",
): WorkflowSurfaceState {
  const stageState = deriveStageState(contract, contract, project, userRole);
  const sharedActions = deriveAvailableWorkflowActions(stageState, userRole);
  const fundingActions = stageState.fundingStatus !== "clear"
    ? {
      ...sharedActions,
      reason: stageState.fundingStatus === "blocked"
        ? "Funding cover is insufficient for this stage."
        : "Funding cover is below the required reserve.",
      authorityLabel: "Treasury funding authority",
      primaryActions: [
        { key: "review_funding", label: "Resolve funding", enabled: true, intent: "primary" as const },
      ],
      secondaryActions: [
        { key: "escalate", label: "Escalate", enabled: true },
        { key: "reassign", label: "Reassign", enabled: true },
      ],
    }
    : sharedActions;
  const fundsGate = deriveFundsGate(stageState, userRole);

  return {
    id: `${project.id ?? "project"}-${contract.id ?? "contract"}-funding`,
    title: project.name ?? "Funds",
    dominantAction: fundsGate.dominantAction,
    nextAction: fundsGate.nextAction,
    reason: fundsGate.reason ?? fundingActions.reason,
    requiredActor: fundsGate.requiredActor ?? fundingActions.authorityLabel,
    status: fundsGate.status,
    value: stageState.availableFundingCover,
    primaryActions: fundsGate.primaryActions ?? fundingActions.primaryActions,
    secondaryActions: fundsGate.secondaryActions ?? fundingActions.secondaryActions,
    detailRows: [
      ["Project", project.name ?? "—"],
      ["Contract", contract.title ?? contract.name ?? "—"],
      ["30-day WIP", formatCurrency(stageState.projectedWip30Days)],
      ["Reserve buffer", formatCurrency(stageState.reserveBuffer)],
      ["Total required", formatCurrency(stageState.totalRequiredWithBuffer)],
      ["Funding cover", formatCurrency(stageState.availableFundingCover)],
      ["Funding gap", formatCurrency(stageState.fundingGap)],
    ],
  };
}

function deriveFundsGate(stageState: ReturnType<typeof deriveStageState>, userRole: string) {
  const canRelease = /treasury|funder|administrator/i.test(userRole);

  if (stageState.approvalStatus !== "approved") {
    return {
      dominantAction: "Approval required",
      nextAction: "Approve stage",
      reason: "Approval chain is not complete.",
      requiredActor: "Commercial approval authority",
      status: "pending",
      primaryActions: [
        { key: "approve", label: "Approve", enabled: true, intent: "primary" as const },
      ],
      secondaryActions: [
        { key: "reassign", label: "Reassign", enabled: true },
        { key: "escalate", label: "Escalate", enabled: true },
      ],
    };
  }

  if (stageState.fundingStatus !== "clear") {
    return {
      dominantAction: "Funding shortfall",
      nextAction: "Resolve funding",
      reason: stageState.fundingStatus === "blocked"
        ? "Funding cover is insufficient for this stage."
        : "Funding cover is below the required reserve.",
      requiredActor: "Treasury funding authority",
      status: stageState.fundingStatus === "blocked" ? "blocked" : "warning",
      primaryActions: [
        { key: "review_funding", label: "Resolve funding", enabled: true, intent: "primary" as const },
      ],
      secondaryActions: [
        { key: "escalate", label: "Escalate", enabled: true },
        { key: "reassign", label: "Reassign", enabled: true },
      ],
    };
  }

  if (stageState.disputeStatus === "open" || stageState.disputeStatus === "responded") {
    return {
      dominantAction: "Blocked by dispute",
      nextAction: "Review dispute",
      reason: stageState.dominantAction.reason,
      requiredActor: "Dispute response authority",
      status: "blocked",
    };
  }

  if (stageState.releaseStatus !== "blocked" && stageState.remainingReleasableValue > 0) {
    return {
      dominantAction: "Release ready",
      nextAction: canRelease ? "Confirm release" : "Treasury authority required",
      reason: "Approval, evidence, dispute, and funding gates are clear.",
      requiredActor: canRelease ? "Treasury release authority" : "Treasury authority required",
      status: "ready",
      primaryActions: [
        { key: canRelease ? "confirm_release" : "view_release", label: canRelease ? "Release payment" : "View release", enabled: canRelease, intent: "primary" as const },
      ],
      secondaryActions: [
        { key: "view_funding", label: "View funding", enabled: true },
      ],
    };
  }

  return {
    dominantAction: "Funding clear",
    nextAction: "No action",
    reason: "No funding action is currently required.",
    requiredActor: "System monitoring",
    status: "clear",
    primaryActions: [] as UnifiedWorkflowControl[],
    secondaryActions: [] as UnifiedWorkflowControl[],
  };
}

export function deriveProjectWorkflowState(
  project: UnifiedProjectLike = {},
  userRole = "",
): WorkflowSurfaceState {
  const contracts = project.contracts ?? [];
  const contractStates = contracts.map((contract) => deriveStageState(contract, contract, project, userRole));
  const activeState = [...contractStates].sort(compareStageStatePriority)[0];
  const activeActions = activeState ? deriveAvailableWorkflowActions(activeState, userRole) : fallbackActions();

  return {
    id: project.id ?? "project",
    title: project.name ?? "Project",
    dominantAction: activeState?.dominantAction.label ?? "No action",
    nextAction: activeState?.dominantAction.nextAction || project.actionCue || "Review project",
    reason: activeState?.dominantAction.reason ?? project.fundingSummary ?? "Project contracts are ready for workflow review.",
    requiredActor: activeActions.authorityLabel,
    status: activeState ? deriveSurfaceStatus(activeState) : "clear",
    value: project.totalValue ?? 0,
    primaryActions: activeActions.primaryActions,
    secondaryActions: activeActions.secondaryActions,
    detailRows: [
      ["Location", project.location ?? "—"],
      ["Funding status", project.fundingStatus ?? "—"],
      ["Funding summary", project.fundingSummary ?? "—"],
      ["Contracts", String(contracts.length)],
    ],
  };
}

export function deriveAccountWorkflowState({
  id,
  title,
  dominantAction,
  nextAction,
  reason,
  requiredActor,
  status,
  value = 0,
  primaryActions,
  secondaryActions,
  detailRows,
}: {
  id: string;
  title: string;
  dominantAction: string;
  nextAction: string;
  reason: string;
  requiredActor: string;
  status: string;
  value?: number;
  primaryActions: UnifiedWorkflowControl[];
  secondaryActions?: UnifiedWorkflowControl[];
  detailRows: Array<[string, string]>;
}): WorkflowSurfaceState {
  return {
    id,
    title,
    dominantAction,
    nextAction,
    reason,
    requiredActor,
    status,
    value,
    primaryActions,
    secondaryActions: secondaryActions ?? [],
    detailRows,
  };
}

function compareStageStatePriority(
  a: ReturnType<typeof deriveStageState>,
  b: ReturnType<typeof deriveStageState>,
) {
  const priorityRank = { critical: 0, high: 1, low: 2 };
  const actionDiff = priorityRank[a.dominantAction.priority] - priorityRank[b.dominantAction.priority];
  if (actionDiff !== 0) return actionDiff;
  if (a.fundingStatus !== b.fundingStatus) {
    const fundingRank = { blocked: 0, warning: 1, clear: 2 };
    return fundingRank[a.fundingStatus] - fundingRank[b.fundingStatus];
  }
  return (b.approvedValue ?? b.availableFundingCover ?? 0) - (a.approvedValue ?? a.availableFundingCover ?? 0);
}

function deriveSurfaceStatus(stageState: ReturnType<typeof deriveStageState>) {
  if (stageState.dominantAction.type === "funding_block" || stageState.dominantAction.type === "evidence_required") return "blocked";
  if (stageState.dominantAction.type === "dispute_active") return "in review";
  if (stageState.dominantAction.type === "approval_required") return "pending";
  if (stageState.dominantAction.type === "release_ready") return "ready";
  return "clear";
}

function fallbackActions() {
  return {
    reason: "No workflow action is currently required.",
    authorityLabel: "System monitoring",
    blockedReason: undefined,
    canApprove: false,
    canReturn: false,
    canClarify: false,
    canUploadEvidence: false,
    canRelease: false,
    canRespondToDispute: false,
    canEscalate: false,
    canReassign: false,
    primaryActions: [] as UnifiedWorkflowControl[],
    secondaryActions: [] as UnifiedWorkflowControl[],
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getUnifiedStageContext(stage: UnifiedStageLike, contract: UnifiedContractLike, project: UnifiedProjectLike) {
  const approvedValue = stage.approvedValue ?? 0;
  const disputedValue = Math.max(0, stage.disputedValue ?? stage.disputedAmount ?? stage.dispute?.affectedValue ?? 0);

  return {
    projectId: project.id,
    projectName: project.name,
    contractId: contract.id,
    contractName: contract.title ?? contract.name,
    stageId: stage.id,
    stageName: stage.name ?? stage.title,
    stageStatus: stage.stageStatus ?? stage.status,
    approvedValue,
    disputedValue,
    authorisedReleaseValue: Math.max(0, approvedValue - disputedValue),
  };
}

function deriveUnifiedEvidenceStatus(stage: UnifiedStageLike) {
  const required = stage.requiredEvidence || [];
  const submitted = stage.submittedEvidence || [];
  if (!required.length) {
    const incompleteChecklist = stage.checklist?.some((item) => !item.done) ?? false;
    if (incompleteChecklist && !stage.evidence?.length) return "missing" as const;
    return "clear" as const;
  }

  const missing = required.filter((requiredType) => !submitted.some((submittedItem) => submittedItem.type === requiredType));
  if (missing.length === 0) return "clear" as const;
  if (submitted.length > 0) return "partial" as const;
  return "missing" as const;
}

function deriveUnifiedFundingAssuranceContext(stage: UnifiedStageLike) {
  const approvedValue = stage.approvedValue ?? 0;
  const stageValue = stage.value ?? approvedValue;
  const projectedWip30Days = Math.max(0, stage.projectedWip30Days ?? stage.wipRequired ?? Math.round(Math.max(0, stageValue - approvedValue) * 0.18));
  const reserveBuffer = Math.max(0, stage.reserveBuffer ?? Math.round(projectedWip30Days * 0.15));
  const totalRequiredWithBuffer = projectedWip30Days + reserveBuffer;
  const ringfencedFunds = Math.max(0, stage.ringfencedFunds ?? 0);
  const allocatedFunds = Math.max(0, stage.allocatedFunds ?? stage.availableFunds ?? inferFundingCover(stage, totalRequiredWithBuffer));
  const availableFundingCover = ringfencedFunds > 0 ? ringfencedFunds : allocatedFunds;
  const fundingGap = Math.max(0, totalRequiredWithBuffer - availableFundingCover);

  let fundingStatus: UnifiedFundingStatus = "clear";
  if (fundingGap > 0 && availableFundingCover > 0) fundingStatus = "warning";
  if (availableFundingCover <= 0 || (totalRequiredWithBuffer > 0 && fundingGap >= totalRequiredWithBuffer)) fundingStatus = "blocked";

  return {
    projectedWip30Days,
    reserveBuffer,
    totalRequiredWithBuffer,
    ringfencedFunds,
    allocatedFunds,
    availableFundingCover,
    fundingGap,
    fundingStatus,
  };
}

function deriveUnifiedDisputeContext(stage: UnifiedStageLike) {
  const approvedValue = stage.approvedValue ?? 0;
  const disputedValue = Math.max(0, stage.disputedValue ?? stage.disputedAmount ?? stage.dispute?.affectedValue ?? 0);
  const releasedValue = stage.releasedValue ?? 0;
  const undisputedApprovedValue = Math.max(0, approvedValue - disputedValue);
  const remainingUndisputedReleasableValue = Math.max(0, undisputedApprovedValue - releasedValue);
  const disputeActive = Boolean(stage.dispute?.isActive || disputedValue > 0);

  let disputeStatus: UnifiedDisputeStatus = "clear";
  if (disputeActive) disputeStatus = "open";
  if (disputeActive && stage.disputeResponseSubmitted) disputeStatus = "responded";
  if (stage.disputeResolvedExternally || stage.dispute?.status === "closed") disputeStatus = disputedValue > 0 ? "external_resolution" : "clear";

  return {
    disputedValue,
    undisputedApprovedValue,
    remainingUndisputedReleasableValue,
    disputeStatus,
  };
}

function deriveUnifiedReleaseContext(stage: UnifiedStageLike, userRole: string) {
  const disputeContext = deriveUnifiedDisputeContext(stage);
  const fundingContext = deriveUnifiedFundingAssuranceContext(stage);
  const evidenceStatus = deriveUnifiedEvidenceStatus(stage);
  const approvalStatus = deriveUnifiedApprovalStatus(stage);
  const approvedValue = stage.approvedValue ?? 0;
  const releasedValue = stage.releasedValue ?? 0;
  const authorisedReleaseValue = disputeContext.undisputedApprovedValue;
  const remainingReleasableValue = disputeContext.remainingUndisputedReleasableValue;
  const hasReleaseAuthority = /treasury|funder|administrator/i.test(userRole);

  let releaseBlockedReason = "";
  if (remainingReleasableValue === 0 && authorisedReleaseValue > 0) releaseBlockedReason = "Nothing left to release";
  else if (evidenceStatus !== "clear") releaseBlockedReason = "Evidence incomplete";
  else if (fundingContext.fundingStatus === "blocked") releaseBlockedReason = "Funding shortfall";
  else if (fundingContext.fundingStatus === "warning") releaseBlockedReason = "Reserve shortfall";
  else if (approvalStatus !== "approved") releaseBlockedReason = "Approval required";
  else if (!hasReleaseAuthority) releaseBlockedReason = "Treasury authority required";

  const isReleaseBlocked = Boolean(releaseBlockedReason && releaseBlockedReason !== "Nothing left to release");
  let releaseStatus: UnifiedReleaseStatus = "blocked";
  if (remainingReleasableValue === 0 && authorisedReleaseValue > 0) releaseStatus = "released";
  else if (!isReleaseBlocked && remainingReleasableValue > 0 && releasedValue > 0) releaseStatus = "partial_released";
  else if (!isReleaseBlocked && remainingReleasableValue > 0) releaseStatus = "ready";

  return {
    approvedValue,
    releasedValue,
    authorisedReleaseValue,
    remainingReleasableValue,
    releaseStatus,
    isReleaseBlocked,
    releaseBlockedReason,
  };
}

function deriveUnifiedApprovalStatus(stage: UnifiedStageLike) {
  if (stage.approvalStatus) return stage.approvalStatus;
  if (stage.approvalState === "Approved" || stage.status === "approved" || stage.status === "Released") return "approved";
  const required = stage.requiredApprovals ?? [];
  const completed = stage.completedApprovals ?? [];
  if (required.length > 0 && required.every((approvalId) => completed.includes(approvalId))) return "approved";
  return "pending";
}

function inferFundingCover(stage: UnifiedStageLike, totalRequiredWithBuffer: number) {
  if (stage.fundingStatus === "funded" || stage.fundingState === "Available to release") return Math.max(stage.approvedValue ?? 0, totalRequiredWithBuffer);
  if (stage.fundingStatus === "part_funded" || stage.fundingState === "Banked" || stage.fundingState === "Released") return Math.round(totalRequiredWithBuffer * 0.72);
  if (stage.fundingStatus === "funding_gap" || stage.fundingState === "Proof of funds pending") return Math.round(totalRequiredWithBuffer * 0.35);
  return stage.fundingState === "Blocked" ? 0 : totalRequiredWithBuffer;
}
