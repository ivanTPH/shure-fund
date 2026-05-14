import { hasWorkflowAuthority, normaliseWorkflowRole, type WorkflowAuthorityAction } from "./contactIdentity";

export type ActionFeedActionType = "approval" | "task" | "dispute";
export type ActionFeedUrgency = "action_required" | "at_risk";
export type ActionFeedStatusGroup = "action_required" | "at_risk" | "completed";
export type ActionFeedStatusType =
  | "dispute"
  | "awaiting_signoff"
  | "requires_action"
  | "at_risk"
  | "in_progress"
  | "ready";

export type WorkflowStatus = "pending" | "under_review" | "approved" | "rejected" | "disputed" | "resolved";
export type WorkflowAuthority = "qs" | "contractor" | "client" | "treasury" | "system";
export type FundingStatus = "funded" | "part_funded" | "funding_gap" | "locked";
export type FundingAssuranceStatus = "clear" | "warning" | "blocked";
export type ReleaseDecision =
  | "ready"
  | "blocked_dispute"
  | "blocked_funding"
  | "blocked_approval"
  | "partial_release"
  | "released";
export type ReleaseStatus = "blocked" | "ready" | "partial_released" | "released";

export type Attachment = {
  id: string;
  type: "image" | "file";
  url: string;
  name: string;
  uploadedBy: string;
};

export type NextRequiredAction = {
  label: string;
  ownerRole: string;
  ownerAuthority: WorkflowAuthority;
  urgency: "critical" | "high" | "normal";
  reason: string;
  type?:
    | "funding_block"
    | "evidence_required"
    | "dispute_active"
    | "approval_required"
    | "release_ready"
    | "info"
    | "authority_required"
    | "workflow_action";
  priority?: "critical" | "high" | "normal" | "low";
  nextAction: string;
  blocked?: boolean;
  blockedReason?: string;
  authorityActionType?: WorkflowAuthorityAction;
};

export type EvidencePackage = {
  images: Attachment[];
  files: Attachment[];
  plans: Attachment[];
  contracts: Attachment[];
  regulations: Attachment[];
};

export type ApprovalChainStep = {
  stepId: string;
  role: string;
  actorId?: string;
  status: "complete" | "current" | "upcoming" | "rejected" | "returned";
  decision?: "approved" | "rejected" | "returned" | "requested_change";
  timestamp?: number;
  note?: string;
};

export type WorkflowEscalation = {
  isEscalated: boolean;
  escalatedFrom?: string;
  escalatedTo?: string;
  reason?: string;
  timestamp?: number;
};

export type WorkflowReassignment = {
  currentOwnerId?: string;
  previousOwnerId?: string;
  reassignedBy?: string;
  reason?: string;
  timestamp?: number;
};

export type EvidenceFilter = "all" | "images" | "plans" | "contracts" | "regulations" | "files";
export type EvidenceRequirementType = "image" | "file" | "plan" | "contract" | "regulation";

export type ThreadMessage = {
  id: string;
  senderId: string;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  visibility?: "public_thread" | "internal_note";
  deliveryStatus?: "draft" | "sent" | "updated";
  actionIntent?: "reply" | "clarification" | "evidence" | "resolution_note";
  authoredForRole?: "qs" | "contractor" | "client" | "treasury" | null;
};

export type ThreadSection = {
  messages: ThreadMessage[];
};

export type DraftState = {
  draftText: string;
  draftAttachments: Attachment[];
  isComposerOpen: boolean;
  replyToMessageId?: string;
};

export type ActivityEvent = {
  id: string;
  type:
    | "note"
    | "status_change"
    | "approval"
    | "dispute"
    | "funding"
    | "evidence_submitted"
    | "evidence_updated"
    | "certification_completed"
    | "approval_completed"
    | "approval_returned"
    | "clarification_requested"
    | "dispute_raised"
    | "dispute_responded"
    | "dispute_marked_external_resolution"
    | "workflow_escalated"
    | "workflow_reassigned"
    | "release_confirmation_started"
    | "payment_released"
    | "payment_partially_released";
  actorId: string;
  text: string;
  timestamp: number;
  eventContextType?: string;
  stageId?: string;
  stageName?: string;
  stageStatus?: string;
  contractId?: string;
  contractName?: string;
  projectId?: string;
  projectName?: string;
  approvedValue?: number;
  disputedValue?: number;
  authorisedReleaseValue?: number;
  releasedValue?: number;
  releaseAmount?: number;
  remainingReleasableValue?: number;
  actor?: string;
  actorRole?: string;
  reason?: string;
  decision?: string;
  note?: string;
  assignee?: string;
  evidenceCount?: number;
  disputeValue?: number;
};

export type ApprovalHistoryEvent = {
  id: string;
  actorId: string;
  decision: "approved" | "rejected" | "returned" | "requested_change";
  note?: string;
  timestamp: number;
};

export type ActionFeedContractContext = {
  permissions: Record<string, string>;
  contacts: Record<
    string,
    {
      name: string;
      organisation: string;
      email: string;
      phone: string;
      about: string;
    }
  >;
};

export type WorkflowDispute = {
  isActive: boolean;
  raisedBy: string;
  reason: string;
  affectedValue: number;
  status: "open" | "under_review" | "closed";
};

export type ActionFeedItem = {
  id: string;
  type: "dispute" | "approval" | "info";
  contractName: string;
  site: string;
  value: number;
  timestamp: number;
  isRead: boolean;
  requiresAction: boolean;
  isResolved: boolean;
  sections: {
    qs?: ThreadSection;
    contractor?: ThreadSection;
  };
  status: WorkflowStatus;
  currentAuthority: WorkflowAuthority;
  requiredApprovals: string[];
  completedApprovals: string[];
  dispute: WorkflowDispute;
  drafts: Partial<Record<"qs" | "contractor" | "activity", DraftState>>;
  activity: ActivityEvent[];
  approvalHistory: ApprovalHistoryEvent[];
  evidencePackage?: EvidencePackage;
  requiredEvidence?: EvidenceRequirementType[];
  submittedEvidence?: Array<{ type: EvidenceRequirementType; attachmentId?: string }>;
  approvalChain?: ApprovalChainStep[];
  escalation?: WorkflowEscalation;
  reassignment?: WorkflowReassignment;
  fundingStatus: FundingStatus;
  projectedWip30Days: number;
  reserveBuffer: number;
  totalRequiredWithBuffer: number;
  ringfencedFunds: number;
  allocatedFunds: number;
  availableFundingCover: number;
  fundingGap: number;
  approvedValue: number;
  disputedValue: number;
  availableFunds: number;
  requiredFunds: number;
  releaseEligibleValue: number;
  releasedValue: number;
  remainingReleasableValue: number;
  fundingShortfall: number;
  isReleaseBlocked: boolean;
  releaseBlockedReason: string;
  releaseDecision: ReleaseDecision;
  releaseStatus: ReleaseStatus;
  contractContext: ActionFeedContractContext;
  title: string;
  contractTitle: string;
  projectId: string;
  projectName: string;
  projectAvatar: string;
  contractId: string;
  stageId: string;
  stageName: string;
  stageStatus: string;
  authorisedReleaseValue: number;
  summary: string;
  actionType: ActionFeedActionType;
  actionLabel: string;
  actionRequired: string;
  destination: string;
  hasEvidence: boolean;
  canApprove: boolean;
  canUpload: boolean;
  canClarify: boolean;
  statusGroup: ActionFeedStatusGroup;
  statusType: ActionFeedStatusType;
  timeSensitive?: boolean;
  expanded?: boolean;
  submittedBy?: string;
  currentReviewer?: string;
  nextApprover?: string;
  fundingState?: string;
  disputedAmount?: number;
  disputeSummary?: string;
  disputeResponseSubmitted?: boolean;
  disputeResolvedExternally?: boolean;
  urgency: ActionFeedUrgency;
  priorityTimestamp: string;
  notificationType: "dispute" | "approval" | "programme" | "information";
  eventContextType: string;
};

const currentUserId = "contact-leah-mercer";

export function getActionStageContext(
  stage?: { id?: string; name?: string; status?: string; approvedValue?: number; disputedValue?: number },
  contract?: { id?: string; title?: string; name?: string },
  project?: { id?: string; name?: string },
) {
  const approvedValue = stage?.approvedValue ?? 0;
  const disputedValue = stage?.disputedValue ?? 0;

  return {
    projectId: project?.id,
    projectName: project?.name,
    contractId: contract?.id,
    contractName: contract?.title ?? contract?.name,
    stageId: stage?.id,
    stageName: stage?.name,
    stageStatus: stage?.status,
    approvedValue,
    disputedValue,
    authorisedReleaseValue: Math.max(0, approvedValue - disputedValue),
  };
}

export function getAuditEventBase(
  item: ActionFeedItem,
  userRole?: string,
  currentUser?: { id?: string; name?: string },
) {
  return {
    eventContextType: item.eventContextType,
    projectId: item.projectId,
    projectName: item.projectName,
    contractId: item.contractId,
    contractName: item.contractName,
    stageId: item.stageId,
    stageName: item.stageName,
    stageStatus: item.stageStatus,
    approvedValue: item.approvedValue ?? 0,
    disputedValue: item.disputedValue ?? 0,
    authorisedReleaseValue: item.authorisedReleaseValue ?? 0,
    releasedValue: item.releasedValue ?? 0,
    remainingReleasableValue: item.remainingReleasableValue ?? 0,
    actor: currentUser?.id ?? currentUser?.name ?? "unknown",
    actorRole: userRole ?? "unknown",
  };
}

const steelFrameContractContext: ActionFeedContractContext = {
  permissions: {
    "contact-lena-ward": "Subcontractor",
    "contact-daniel-hart": "Primary contractor approval",
    "contact-liam-price": "Contractor lead",
    "contact-owen-blake": "Quantity surveyor",
    "contact-maya-singh": "Client approver",
    [currentUserId]: "Treasury controller",
  },
  contacts: {
    "contact-lena-ward": {
      name: "Lena Ward",
      organisation: "Northline Structures Ltd",
      email: "lena.ward@northline.example",
      phone: "+44 20 7946 1107",
      about: "Subcontractor package owner submitting evidence and responding to returned items.",
    },
    "contact-daniel-hart": {
      name: "Daniel Hart",
      organisation: "Brent Cross Delivery Ltd",
      email: "daniel.hart@brentcrossdelivery.example",
      phone: "+44 20 7946 1210",
      about: "Primary contractor lead approving claims before funder release.",
    },
    "contact-liam-price": {
      name: "Liam Price",
      organisation: "Northline Structures Ltd",
      email: "liam.price@northline.example",
      phone: "+44 20 7946 1101",
      about: "Site manager coordinating package delivery, progress evidence, and completion submissions.",
    },
    "contact-owen-blake": {
      name: "Owen Blake",
      organisation: "Professional Assurance Services",
      email: "owen.blake@assurance.example",
      phone: "+44 20 7946 1190",
      about: "Professional reviewer responsible for technical assurance and sign-off readiness.",
    },
    "contact-maya-singh": {
      name: "Maya Singh",
      organisation: "Harbour Capital",
      email: "maya.singh@harbourcapital.example",
      phone: "+44 20 7946 1184",
      about: "Commercial approver for contract readiness, held value decisions, and exception escalation.",
    },
    [currentUserId]: {
      name: "Leah Mercer",
      organisation: "Harbour Capital",
      email: "leah.mercer@harbourcapital.example",
      phone: "+44 7700 900321",
      about: "Treasury user with release visibility, dispute resolution authority, and company access controls.",
    },
  },
};

const roofingContractContext: ActionFeedContractContext = {
  permissions: {
    "contact-lena-ward": "Subcontractor",
    "contact-daniel-hart": "Primary contractor approval",
    "contact-ava-singh": "Contractor lead",
    "contact-owen-blake": "Quantity surveyor",
    [currentUserId]: "Treasury controller",
  },
  contacts: {
    "contact-lena-ward": {
      name: "Lena Ward",
      organisation: "Northline Structures Ltd",
      email: "lena.ward@northline.example",
      phone: "+44 20 7946 1107",
      about: "Subcontractor package owner submitting electrical first fix evidence.",
    },
    "contact-daniel-hart": {
      name: "Daniel Hart",
      organisation: "Brent Cross Delivery Ltd",
      email: "daniel.hart@brentcrossdelivery.example",
      phone: "+44 20 7946 1210",
      about: "Primary contractor lead approving claims before funder release.",
    },
    "contact-ava-singh": {
      name: "Ava Singh",
      organisation: "WeatherSeal Roofing Ltd",
      email: "ava.singh@weatherseal.example",
      phone: "+44 161 555 0104",
      about: "Package manager handling roofing progress, notes, and evidence uploads.",
    },
    "contact-owen-blake": {
      name: "Owen Blake",
      organisation: "Professional Assurance Services",
      email: "owen.blake@assurance.example",
      phone: "+44 20 7946 1190",
      about: "Professional reviewer responsible for technical assurance and sign-off readiness.",
    },
    [currentUserId]: {
      name: "Leah Mercer",
      organisation: "Harbour Capital",
      email: "leah.mercer@harbourcapital.example",
      phone: "+44 7700 900321",
      about: "Treasury user with release visibility, dispute resolution authority, and company access controls.",
    },
  },
};

const prelimsContractContext: ActionFeedContractContext = {
  permissions: {
    "contact-samira-khan": "Materials supplier",
    "contact-daniel-hart": "Primary contractor approval",
    "contact-nadia-cole": "Contractor lead",
    "contact-maya-singh": "Client approver",
    [currentUserId]: "Treasury controller",
  },
  contacts: {
    "contact-samira-khan": {
      name: "Samira Khan",
      organisation: "Atlas Materials Supply Co",
      email: "samira.khan@atlasmaterials.example",
      phone: "+44 161 555 0142",
      about: "Materials supplier submitting delivery evidence and invoices.",
    },
    "contact-daniel-hart": {
      name: "Daniel Hart",
      organisation: "Brent Cross Delivery Ltd",
      email: "daniel.hart@brentcrossdelivery.example",
      phone: "+44 20 7946 1210",
      about: "Primary contractor lead approving supplier claims.",
    },
    "contact-nadia-cole": {
      name: "Nadia Cole",
      organisation: "Prime Building Services",
      email: "nadia.cole@primebuilding.example",
      phone: "+44 121 555 0187",
      about: "Commissioning lead for final records, handover readiness, and evidence submission.",
    },
    "contact-maya-singh": {
      name: "Maya Singh",
      organisation: "Harbour Capital",
      email: "maya.singh@harbourcapital.example",
      phone: "+44 20 7946 1184",
      about: "Commercial approver for contract readiness, held value decisions, and exception escalation.",
    },
    [currentUserId]: {
      name: "Leah Mercer",
      organisation: "Harbour Capital",
      email: "leah.mercer@harbourcapital.example",
      phone: "+44 7700 900321",
      about: "Treasury user with release visibility, dispute resolution authority, and company access controls.",
    },
  },
};

const groundworksContractContext: ActionFeedContractContext = {
  permissions: {
    "contact-daniel-hart": "Primary contractor approval",
    "contact-george-millar": "Contractor lead",
    "contact-owen-blake": "Quantity surveyor",
    [currentUserId]: "Treasury controller",
  },
  contacts: {
    "contact-daniel-hart": {
      name: "Daniel Hart",
      organisation: "Brent Cross Delivery Ltd",
      email: "daniel.hart@brentcrossdelivery.example",
      phone: "+44 20 7946 1210",
      about: "Primary contractor lead responding to project delivery and claim issues.",
    },
    "contact-george-millar": {
      name: "George Millar",
      organisation: "Northwest Civils LLP",
      email: "george.millar@northwestcivils.example",
      phone: "+44 161 555 0192",
      about: "Commercial lead responding to held value, variations, and dispute-related evidence.",
    },
    "contact-owen-blake": {
      name: "Owen Blake",
      organisation: "Professional Assurance Services",
      email: "owen.blake@assurance.example",
      phone: "+44 20 7946 1190",
      about: "Professional reviewer responsible for technical assurance and sign-off readiness.",
    },
    [currentUserId]: {
      name: "Leah Mercer",
      organisation: "Harbour Capital",
      email: "leah.mercer@harbourcapital.example",
      phone: "+44 7700 900321",
      about: "Treasury user with release visibility, dispute resolution authority, and company access controls.",
    },
  },
};

function createImageAttachment(id: string, label: string, color: string, uploadedBy: string): Attachment {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
      <rect width="320" height="240" fill="${color}"/>
      <text x="24" y="126" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="700">${label}</text>
    </svg>`,
  );

  return {
    id,
    type: "image",
    url: `data:image/svg+xml;charset=utf-8,${svg}`,
    name: `${label}.jpg`,
    uploadedBy,
  };
}

function createFileAttachment(id: string, name: string, uploadedBy: string): Attachment {
  return {
    id,
    type: "file",
    url: `/documents/${id}`,
    name,
    uploadedBy,
  };
}

const baseActionFeedItems: ActionFeedItem[] = [
  {
    id: "feed-steel-frame-approval",
    type: "approval",
    contractName: "Steel frame package",
    site: "Brent Cross Logistics Hub, NW2",
    value: 680000,
    timestamp: Date.parse("2026-04-18T09:20:00Z"),
    isRead: false,
    requiresAction: true,
    isResolved: false,
    sections: {
      contractor: {
        messages: [
          {
            id: "steel-contractor-1",
            senderId: "contact-liam-price",
            text: "Release pack is complete and ready for sign-off. Structural certificates and progress photos are attached.",
            attachments: [
              createFileAttachment("steel-cert-pack", "Structural certificate pack.pdf", "contact-liam-price"),
              createImageAttachment("steel-photo-1", "Steel frame progress", "#355C7D", "contact-liam-price"),
            ],
            timestamp: Date.parse("2026-04-18T08:55:00Z"),
          },
        ],
      },
      qs: {
        messages: [
          {
            id: "steel-qs-1",
            senderId: "contact-owen-blake",
            text: "Professional assurance review is complete. Waiting for final commercial sign-off before release can proceed.",
            timestamp: Date.parse("2026-04-18T09:20:00Z"),
          },
        ],
      },
    },
    status: "pending",
    currentAuthority: "treasury",
    requiredApprovals: ["contact-owen-blake", "contact-maya-singh", currentUserId],
    completedApprovals: ["contact-owen-blake", "contact-maya-singh"],
    dispute: {
      isActive: false,
      raisedBy: "",
      reason: "",
      affectedValue: 0,
      status: "closed",
    },
    drafts: {},
    activity: [
      {
        id: "steel-activity-1",
        type: "approval",
        actorId: "contact-owen-blake",
        text: "Professional assurance completed.",
        timestamp: Date.parse("2026-04-18T09:20:00Z"),
      },
    ],
    approvalHistory: [
      {
        id: "steel-approval-1",
        actorId: "contact-owen-blake",
        decision: "approved",
        note: "Professional assurance complete.",
        timestamp: Date.parse("2026-04-18T09:20:00Z"),
      },
      {
        id: "steel-approval-2",
        actorId: "contact-maya-singh",
        decision: "approved",
        note: "Commercial approval complete.",
        timestamp: Date.parse("2026-04-18T09:35:00Z"),
      },
    ],
    fundingStatus: "funded",
    projectedWip30Days: 620000,
    reserveBuffer: 60000,
    totalRequiredWithBuffer: 680000,
    ringfencedFunds: 680000,
    allocatedFunds: 680000,
    availableFundingCover: 680000,
    fundingGap: 0,
    approvedValue: 680000,
    disputedValue: 0,
    availableFunds: 680000,
    requiredFunds: 680000,
    releaseEligibleValue: 0,
    releasedValue: 0,
    remainingReleasableValue: 680000,
    fundingShortfall: 0,
    isReleaseBlocked: true,
    releaseBlockedReason: "Approval required",
    releaseDecision: "blocked_approval",
    releaseStatus: "blocked",
    contractContext: steelFrameContractContext,
    title: "Steel frame package",
    contractTitle: "Steel frame package",
    projectId: "project-brent-cross",
    projectName: "Brent Cross Logistics Hub",
    projectAvatar: "BC",
    contractId: "contract-steel-frame",
    stageId: "stage-steel-frame-release",
    stageName: "Stage 4 completion certificate",
    stageStatus: "awaiting_treasury_release",
    authorisedReleaseValue: 680000,
    summary: "Steel frame package is waiting for sign-off before the next release.",
    actionType: "approval",
    actionLabel: "Approve",
    actionRequired: "Sign-off required for £680,000",
    destination: "/notifications/feed-steel-frame-approval/approval",
    hasEvidence: true,
    requiredEvidence: ["image", "file"],
    submittedEvidence: [
      { type: "image", attachmentId: "steel-photo-1" },
      { type: "file", attachmentId: "steel-cert-pack" },
    ],
    canApprove: true,
    canUpload: false,
    canClarify: true,
    statusGroup: "action_required",
    statusType: "awaiting_signoff",
    timeSensitive: true,
    submittedBy: "Liam Price",
    currentReviewer: "Owen Blake",
    nextApprover: "Maya Singh",
    fundingState: "Awaiting professional assurance",
    urgency: "action_required",
    priorityTimestamp: "2026-04-18T09:20:00Z",
    notificationType: "approval",
    eventContextType: "stage_workflow",
    disputedAmount: 0,
    disputeSummary: undefined,
  },
  {
    id: "feed-roofing-evidence",
    type: "info",
    contractName: "Roofing and waterproofing",
    site: "Brent Cross Logistics Hub, NW2",
    value: 390000,
    timestamp: Date.parse("2026-04-18T08:35:00Z"),
    isRead: false,
    requiresAction: true,
    isResolved: false,
    sections: {
      contractor: {
        messages: [
          {
            id: "roofing-contractor-1",
            senderId: "contact-ava-singh",
            text: "Membrane installation is complete. Final completion photos still need to be uploaded before the package can progress.",
            attachments: [createImageAttachment("roof-photo-1", "Roofing evidence", "#2A9D8F", "contact-ava-singh")],
            timestamp: Date.parse("2026-04-18T08:10:00Z"),
          },
        ],
      },
      qs: {
        messages: [
          {
            id: "roofing-qs-1",
            senderId: "contact-owen-blake",
            text: "Please upload final waterproofing evidence so the package can move to the next review step.",
            timestamp: Date.parse("2026-04-18T08:35:00Z"),
          },
        ],
      },
    },
    status: "under_review",
    currentAuthority: "contractor",
    requiredApprovals: ["contact-ava-singh", "contact-owen-blake", currentUserId],
    completedApprovals: [],
    dispute: {
      isActive: false,
      raisedBy: "",
      reason: "",
      affectedValue: 0,
      status: "closed",
    },
    drafts: {},
    activity: [
      {
        id: "roofing-activity-1",
        type: "status_change",
        actorId: "contact-owen-blake",
        text: "Completion evidence requested.",
        timestamp: Date.parse("2026-04-18T08:35:00Z"),
      },
    ],
    approvalHistory: [],
    fundingStatus: "part_funded",
    projectedWip30Days: 340000,
    reserveBuffer: 50000,
    totalRequiredWithBuffer: 390000,
    ringfencedFunds: 0,
    allocatedFunds: 240000,
    availableFundingCover: 240000,
    fundingGap: 150000,
    approvedValue: 390000,
    disputedValue: 0,
    availableFunds: 240000,
    requiredFunds: 390000,
    releaseEligibleValue: 0,
    releasedValue: 0,
    remainingReleasableValue: 390000,
    fundingShortfall: 150000,
    isReleaseBlocked: true,
    releaseBlockedReason: "Evidence incomplete",
    releaseDecision: "blocked_approval",
    releaseStatus: "blocked",
    contractContext: roofingContractContext,
    title: "Roofing and waterproofing",
    contractTitle: "Roofing and waterproofing",
    projectId: "project-brent-cross",
    projectName: "Brent Cross Logistics Hub",
    projectAvatar: "BC",
    contractId: "contract-roofing",
    stageId: "stage-roofing-completion-evidence",
    stageName: "Stage 3 waterproofing completion evidence",
    stageStatus: "evidence_required",
    authorisedReleaseValue: 390000,
    summary: "Roofing and waterproofing still needs completion proof before it can progress.",
    actionType: "task",
    actionLabel: "Upload evidence",
    actionRequired: "Upload evidence to proceed",
    destination: "/notifications/feed-roofing-evidence/task",
    hasEvidence: true,
    requiredEvidence: ["image", "file"],
    submittedEvidence: [
      { type: "image", attachmentId: "roof-photo-1" },
    ],
    canApprove: false,
    canUpload: true,
    canClarify: true,
    statusGroup: "action_required",
    statusType: "requires_action",
    fundingState: "Banked",
    urgency: "action_required",
    priorityTimestamp: "2026-04-18T08:35:00Z",
    notificationType: "programme",
    eventContextType: "stage_workflow",
    disputedAmount: 0,
    disputeSummary: undefined,
  },
  {
    id: "feed-prelims-review",
    type: "info",
    contractName: "Site preliminaries",
    site: "Birmingham Rail Service Yard, B8",
    value: 180000,
    timestamp: Date.parse("2026-04-17T16:10:00Z"),
    isRead: true,
    requiresAction: true,
    isResolved: false,
    sections: {
      contractor: {
        messages: [
          {
            id: "prelims-contractor-1",
            senderId: "contact-nadia-cole",
            text: "Preliminaries summary is ready for commercial review. Site logistics notes and mobilisation cost schedule are attached.",
            attachments: [createFileAttachment("prelims-cost-schedule", "Mobilisation cost schedule.xlsx", "contact-nadia-cole")],
            timestamp: Date.parse("2026-04-17T15:54:00Z"),
          },
        ],
      },
      qs: {
        messages: [
          {
            id: "prelims-qs-1",
            senderId: "contact-maya-singh",
            text: "Commercial review is required before the package can move forward.",
            timestamp: Date.parse("2026-04-17T16:10:00Z"),
          },
        ],
      },
    },
    status: "under_review",
    currentAuthority: "client",
    requiredApprovals: ["contact-maya-singh", currentUserId],
    completedApprovals: [],
    dispute: {
      isActive: false,
      raisedBy: "",
      reason: "",
      affectedValue: 0,
      status: "closed",
    },
    drafts: {},
    activity: [
      {
        id: "prelims-activity-1",
        type: "status_change",
        actorId: "contact-maya-singh",
        text: "Commercial review requested.",
        timestamp: Date.parse("2026-04-17T16:10:00Z"),
      },
    ],
    approvalHistory: [],
    fundingStatus: "funding_gap",
    projectedWip30Days: 160000,
    reserveBuffer: 20000,
    totalRequiredWithBuffer: 180000,
    ringfencedFunds: 0,
    allocatedFunds: 90000,
    availableFundingCover: 90000,
    fundingGap: 90000,
    approvedValue: 180000,
    disputedValue: 0,
    availableFunds: 90000,
    requiredFunds: 180000,
    releaseEligibleValue: 0,
    releasedValue: 0,
    remainingReleasableValue: 180000,
    fundingShortfall: 90000,
    isReleaseBlocked: true,
    releaseBlockedReason: "Approval required",
    releaseDecision: "blocked_approval",
    releaseStatus: "blocked",
    contractContext: prelimsContractContext,
    title: "Site preliminaries",
    contractTitle: "Site preliminaries",
    projectId: "project-birmingham-yard",
    projectName: "Birmingham Rail Service Yard",
    projectAvatar: "BR",
    contractId: "contract-prelims",
    stageId: "stage-prelims-commercial-review",
    stageName: "Stage 2 preliminaries commercial review",
    stageStatus: "commercial_review",
    authorisedReleaseValue: 180000,
    summary: "Site preliminaries needs a commercial review to move forward.",
    actionType: "task",
    actionLabel: "Review contract",
    actionRequired: "Commercial review required",
    destination: "/notifications/feed-prelims-review/task",
    hasEvidence: false,
    requiredEvidence: [],
    submittedEvidence: [],
    canApprove: false,
    canUpload: false,
    canClarify: true,
    statusGroup: "action_required",
    statusType: "requires_action",
    fundingState: "Proof of funds pending",
    urgency: "action_required",
    priorityTimestamp: "2026-04-17T16:10:00Z",
    notificationType: "information",
    eventContextType: "stage_workflow",
    disputedAmount: 0,
    disputeSummary: undefined,
  },
  {
    id: "feed-groundworks-dispute",
    type: "dispute",
    contractName: "Groundworks and drainage",
    site: "Salford Quays Residential Plot A, M50",
    value: 540000,
    timestamp: Date.parse("2026-04-18T10:05:00Z"),
    isRead: false,
    requiresAction: true,
    isResolved: false,
    sections: {
      qs: {
        messages: [
          {
            id: "groundworks-qs-1",
            senderId: "contact-owen-blake",
            text: "Groundworks not passed. Additional concrete required before trench reinstatement can be certified.",
            attachments: [
              createImageAttachment("groundworks-qs-photo-1", "Trench inspection", "#B56576", "contact-owen-blake"),
              createFileAttachment("groundworks-qs-report", "QS site inspection note.pdf", "contact-owen-blake"),
            ],
            timestamp: Date.parse("2026-04-18T09:12:00Z"),
          },
        ],
      },
      contractor: {
        messages: [
          {
            id: "groundworks-contractor-1",
            senderId: "contact-george-millar",
            text: "Work completed per contract specification and supplier submission. Reinstatement was not included in the instructed scope.",
            attachments: [
              createImageAttachment("groundworks-contractor-photo-1", "Completed drainage run", "#6D597A", "contact-george-millar"),
              createFileAttachment("groundworks-contractor-scope", "Instruction scope extract.pdf", "contact-george-millar"),
            ],
            timestamp: Date.parse("2026-04-18T10:08:00Z"),
          },
        ],
      },
    },
    status: "disputed",
    currentAuthority: "treasury",
    requiredApprovals: ["contact-owen-blake", currentUserId],
    completedApprovals: [],
    dispute: {
      isActive: true,
      raisedBy: "contact-owen-blake",
      reason: "Clarify the drainage variation and held value before the package can move forward.",
      affectedValue: 260000,
      status: "open",
    },
    drafts: {},
    activity: [
      {
        id: "groundworks-activity-1",
        type: "dispute",
        actorId: "contact-owen-blake",
        text: "Dispute raised against trench reinstatement scope.",
        timestamp: Date.parse("2026-04-18T09:12:00Z"),
      },
      {
        id: "groundworks-activity-2",
        type: "funding",
        actorId: currentUserId,
        text: "Disputed value held pending resolution.",
        timestamp: Date.parse("2026-04-18T10:05:00Z"),
      },
    ],
    approvalHistory: [],
    fundingStatus: "funded",
    projectedWip30Days: 500000,
    reserveBuffer: 40000,
    totalRequiredWithBuffer: 540000,
    ringfencedFunds: 540000,
    allocatedFunds: 540000,
    availableFundingCover: 540000,
    fundingGap: 0,
    approvedValue: 540000,
    disputedValue: 260000,
    availableFunds: 540000,
    requiredFunds: 540000,
    releaseEligibleValue: 280000,
    releasedValue: 0,
    remainingReleasableValue: 280000,
    fundingShortfall: 0,
    isReleaseBlocked: false,
    releaseBlockedReason: "",
    releaseDecision: "partial_release",
    releaseStatus: "ready",
    contractContext: groundworksContractContext,
    title: "Groundworks and drainage",
    contractTitle: "Groundworks and drainage",
    projectId: "project-salford-quays",
    projectName: "Salford Quays Residential Plot A",
    projectAvatar: "SQ",
    contractId: "contract-groundworks",
    stageId: "stage-groundworks-drainage-certification",
    stageName: "Stage 5 drainage certification",
    stageStatus: "dispute_active",
    authorisedReleaseValue: 280000,
    summary: "Supplier disputes omitted trench reinstatement; value held until clarification.",
    actionType: "dispute",
    actionLabel: "Review dispute",
    actionRequired: "Dispute requires review",
    destination: "/notifications/feed-groundworks-dispute/dispute",
    hasEvidence: true,
    requiredEvidence: ["image", "file"],
    submittedEvidence: [
      { type: "image", attachmentId: "groundworks-qs-photo-1" },
      { type: "file", attachmentId: "groundworks-qs-report" },
    ],
    canApprove: false,
    canUpload: false,
    canClarify: true,
    statusGroup: "at_risk",
    statusType: "dispute",
    timeSensitive: true,
    fundingState: "Blocked",
    disputedAmount: 260000,
    disputeSummary: "Clarify the drainage variation and held value before the package can move forward.",
    urgency: "at_risk",
    priorityTimestamp: "2026-04-18T10:05:00Z",
    notificationType: "dispute",
    eventContextType: "stage_workflow",
  },
];

const steelApproval = baseActionFeedItems[0];
const electricalEvidence = baseActionFeedItems[1];
const supplierReview = baseActionFeedItems[2];
const groundworksDispute = baseActionFeedItems[3];

export const actionFeedItems: ActionFeedItem[] = [
  {
    ...groundworksDispute,
    projectId: "project-brent-cross",
    projectName: "Brent Cross Phase 1",
    projectAvatar: "BC",
    site: "Brent Cross Phase 1, NW2",
    summary: "Active dispute freezes the disputed drainage value while the undisputed value remains visible for release control.",
  },
  {
    ...steelApproval,
    projectName: "Brent Cross Phase 1",
    site: "Brent Cross Phase 1, NW2",
    currentAuthority: "treasury",
    status: "approved",
    requiredApprovals: ["contact-owen-blake", "contact-daniel-hart", currentUserId],
    completedApprovals: ["contact-owen-blake", "contact-daniel-hart"],
    releaseStatus: "ready",
    releaseDecision: "ready",
    releaseBlockedReason: "",
    summary: "Steel frame package is approved and funded; treasury can release the approved value.",
    actionRequired: "Release approved funded value",
    actionLabel: "Release payment",
    fundingState: "Available to release",
  },
  {
    ...steelApproval,
    id: "feed-groundworks-approval-required",
    contractName: "Groundworks and drainage",
    title: "Groundworks and drainage",
    contractTitle: "Groundworks and drainage",
    contractId: "contract-groundworks",
    projectName: "Brent Cross Phase 1",
    site: "Brent Cross Phase 1, NW2",
    stageId: "stage-groundworks-primary-approval",
    stageName: "Stage 2 drainage claim approval",
    currentAuthority: "client",
    requiredApprovals: ["contact-owen-blake", "contact-daniel-hart", currentUserId],
    completedApprovals: ["contact-owen-blake"],
    status: "under_review",
    isResolved: false,
    requiresAction: true,
    releaseStatus: "blocked",
    releaseDecision: "blocked_approval",
    summary: "QS has certified the drainage claim; primary contractor approval is required before treasury can release.",
    actionRequired: "Primary contractor approval required",
    actionLabel: "Approve claim",
    priorityTimestamp: "2026-04-18T09:50:00Z",
  },
  {
    ...electricalEvidence,
    id: "feed-electrical-returned-evidence",
    contractName: "Electrical first fix",
    title: "Electrical first fix",
    contractTitle: "Electrical first fix",
    contractId: "contract-electrical-first-fix",
    projectName: "Brent Cross Phase 1",
    site: "Brent Cross Phase 1, NW2",
    currentAuthority: "contractor",
    status: "rejected",
    releaseBlockedReason: "Evidence incomplete",
    summary: "QS returned the first fix evidence because cable tray photographs do not match the marked-up drawing.",
    actionRequired: "Resubmit returned evidence",
    actionLabel: "Upload evidence",
    stageId: "stage-electrical-returned-evidence",
    stageName: "Electrical first fix evidence return",
    submittedBy: "Lena Ward",
    currentReviewer: "Owen Blake",
    activity: [
      ...electricalEvidence.activity,
      {
        id: "electrical-returned-activity",
        type: "approval_returned",
        actorId: "contact-owen-blake",
        text: "QS returned evidence: cable tray photos need resubmission.",
        timestamp: Date.parse("2026-04-18T08:50:00Z"),
      },
    ],
  },
  {
    ...supplierReview,
    id: "feed-materials-invoice",
    contractName: "Materials supply package",
    title: "Materials supply package",
    contractTitle: "Materials supply package",
    contractId: "contract-materials-supply",
    projectId: "project-brent-cross",
    projectName: "Brent Cross Phase 1",
    projectAvatar: "BC",
    site: "Brent Cross Phase 1, NW2",
    currentAuthority: "contractor",
    requiredApprovals: ["contact-owen-blake", "contact-daniel-hart", currentUserId],
    completedApprovals: [],
    fundingStatus: "funded",
    allocatedFunds: 210000,
    availableFundingCover: 210000,
    fundingGap: 0,
    availableFunds: 210000,
    value: 210000,
    approvedValue: 210000,
    requiredFunds: 210000,
    requiredEvidence: ["file"],
    submittedEvidence: [],
    summary: "Supplier must submit the delivery note and invoice before QS validation can begin.",
    actionRequired: "Submit delivery invoice",
    actionLabel: "Submit invoice",
    submittedBy: "Samira Khan",
    currentReviewer: "Owen Blake",
    stageId: "stage-materials-invoice",
    stageName: "Materials delivery invoice",
    priorityTimestamp: "2026-04-18T07:40:00Z",
  },
  {
    ...supplierReview,
    id: "feed-variation-funding",
    contractName: "Electrical first fix variation",
    title: "Electrical first fix variation",
    contractTitle: "Electrical first fix variation",
    contractId: "contract-electrical-first-fix",
    projectId: "project-brent-cross",
    projectName: "Brent Cross Phase 1",
    projectAvatar: "BC",
    site: "Brent Cross Phase 1, NW2",
    currentAuthority: "treasury",
    requiredApprovals: ["contact-owen-blake", "contact-daniel-hart", currentUserId],
    completedApprovals: ["contact-owen-blake", "contact-daniel-hart"],
    fundingStatus: "funding_gap",
    allocatedFunds: 45000,
    availableFundingCover: 45000,
    fundingGap: 55000,
    availableFunds: 45000,
    value: 100000,
    approvedValue: 100000,
    requiredFunds: 100000,
    totalRequiredWithBuffer: 100000,
    projectedWip30Days: 90000,
    reserveBuffer: 10000,
    releaseStatus: "blocked",
    releaseDecision: "blocked_funding",
    releaseBlockedReason: "Reserve shortfall",
    summary: "Approved variation cannot activate until the funding shortfall is covered.",
    actionRequired: "Funding shortfall",
    actionLabel: "Resolve funding",
    stageId: "stage-electrical-variation-funding",
    stageName: "Variation funding gate",
    priorityTimestamp: "2026-04-18T07:20:00Z",
  },
  {
    ...steelApproval,
    id: "feed-completed-release",
    contractName: "Completed mobilisation release",
    title: "Completed mobilisation release",
    contractTitle: "Completed mobilisation release",
    contractId: "contract-groundworks",
    projectName: "Brent Cross Phase 1",
    site: "Brent Cross Phase 1, NW2",
    isRead: true,
    requiresAction: false,
    isResolved: true,
    statusGroup: "completed",
    statusType: "ready",
    status: "approved",
    currentAuthority: "system",
    releasedValue: 85000,
    remainingReleasableValue: 0,
    releaseStatus: "released",
    releaseDecision: "released",
    summary: "Mobilisation release completed and recorded in the audit trail.",
    actionRequired: "Payment released",
    actionLabel: "Released",
    priorityTimestamp: "2026-04-16T11:20:00Z",
  },
];

export function approveStage(itemId: string, userId: string, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  if (!hasWorkflowAuthority({ userRole: getUserWorkflowRole(item, userId), actionType: "approve" })) {
    return appendActivityEventToItem(item, {
      id: `${itemId}-activity-${Date.now()}`,
      type: "status_change",
      actorId: userId,
      text: "Approval blocked: insufficient authority.",
      timestamp: Date.now(),
    });
  }
  if (deriveEvidenceStatus(item) !== "clear") {
    return appendActivityEventToItem(item, {
      id: `${itemId}-activity-${Date.now()}`,
      type: "status_change",
      actorId: userId,
      text: "Approval blocked: required evidence is incomplete.",
      timestamp: Date.now(),
    });
  }

  const completedApprovals = Array.from(new Set([...item.completedApprovals, userId]));
  const nextAuthority = getNextAuthority(item, completedApprovals);
  const allApprovalsComplete = item.requiredApprovals.every((approvalId) => completedApprovals.includes(approvalId));

  return appendApprovalHistoryToItem(appendActivityEventToItem({
    ...item,
    completedApprovals,
    currentAuthority: allApprovalsComplete ? item.currentAuthority : nextAuthority,
    status: allApprovalsComplete ? ("approved" as const) : ("under_review" as const),
    requiresAction: !allApprovalsComplete,
    isResolved: allApprovalsComplete,
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: getAuthorityForUser(item, userId) === "qs" ? "certification_completed" : "approval_completed",
    actorId: userId,
    text: allApprovalsComplete ? "All approvals completed." : "Approval recorded.",
    decision: "approved",
    timestamp: Date.now(),
  }), {
    id: `${itemId}-approval-${Date.now()}`,
    actorId: userId,
    decision: "approved",
    timestamp: Date.now(),
  });
}

export function rejectStage(itemId: string, userId: string, item = getActionFeedItem(itemId)) {
  if (!item) return null;

  return appendApprovalHistoryToItem(appendActivityEventToItem({
    ...item,
    status: "rejected" as const,
    currentAuthority: "contractor" as const,
    requiresAction: true,
    isResolved: false,
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "approval_returned",
    actorId: userId,
    text: "Stage rejected and returned.",
    decision: "rejected",
    timestamp: Date.now(),
  }), {
    id: `${itemId}-approval-${Date.now()}`,
    actorId: userId,
    decision: "rejected",
    timestamp: Date.now(),
  });
}

export function raiseDispute(itemId: string, userId: string, reason: string, item = getActionFeedItem(itemId)) {
  if (!item) return null;

  return appendActivityEventToItem({
    ...item,
    status: "disputed" as const,
    currentAuthority: "treasury" as const,
    requiresAction: true,
    isResolved: false,
    disputeResponseSubmitted: false,
    disputeResolvedExternally: false,
    disputedValue: item.disputedAmount || item.value,
    dispute: {
      isActive: true,
      raisedBy: userId,
      reason,
      affectedValue: item.disputedAmount || item.value,
      status: "open" as const,
    },
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "dispute_raised",
    actorId: userId,
    text: reason,
    reason,
    disputeValue: item.disputedAmount || item.value,
    timestamp: Date.now(),
  });
}

export function resolveDispute(itemId: string, item = getActionFeedItem(itemId)) {
  if (!item) return null;

  const nextAuthority = getNextAuthority(item, item.completedApprovals);
  return appendActivityEventToItem({
    ...item,
    status: "under_review" as const,
    currentAuthority: nextAuthority,
    disputedValue: 0,
    disputeResolvedExternally: true,
    dispute: {
      ...item.dispute,
      isActive: false,
      status: "closed" as const,
    },
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "dispute_marked_external_resolution",
    actorId: currentUserId,
    text: "Dispute resolved.",
    note: "Dispute resolved.",
    timestamp: Date.now(),
  });
}

export function deriveReleaseDecision(item: ActionFeedItem): ReleaseDecision {
  if (item.releaseDecision === "released") return "released";
  if ((item.remainingReleasableValue ?? 0) === 0 && (item.authorisedReleaseValue ?? 0) > 0) return "released";
  if (deriveEvidenceStatus(item) !== "clear") return "blocked_approval";

  const approvalsComplete = item.requiredApprovals.every((approvalId) => item.completedApprovals.includes(approvalId));
  if (item.status !== "approved" && !approvalsComplete) return "blocked_approval";

  const releasableAmount = Math.max(0, item.approvedValue - item.disputedValue);
  if (item.dispute.isActive && item.disputedValue > 0) {
    if (releasableAmount > 0 && item.availableFunds >= releasableAmount) return "partial_release";
    return "blocked_dispute";
  }

  if (item.availableFunds < item.requiredFunds || item.fundingStatus === "funding_gap" || item.fundingStatus === "locked") {
    return "blocked_funding";
  }

  if (item.status === "approved") return "ready";
  return "blocked_approval";
}

export function deriveReleaseEligibleValue(item: ActionFeedItem) {
  return deriveAuthorisedReleaseValue(item);
}

export function deriveDisputeContext(stage: ActionFeedItem) {
  const approvedValue = stage.approvedValue ?? 0;
  const disputedValue = Math.max(0, stage.disputedValue ?? 0);
  const releasedValue = stage.releasedValue ?? 0;
  const disputeResponseSubmitted =
    Boolean(stage.disputeResponseSubmitted) ||
    stage.activity.some((event) => event.type === "dispute_responded") ||
    Boolean(stage.sections.contractor?.messages.length && disputedValue > 0);
  const disputeResolvedExternally =
    Boolean(stage.disputeResolvedExternally) ||
    stage.activity.some((event) => event.type === "dispute_marked_external_resolution");

  const undisputedApprovedValue = Math.max(0, approvedValue - disputedValue);
  const remainingUndisputedReleasableValue = Math.max(0, undisputedApprovedValue - releasedValue);

  let disputeStatus: "clear" | "open" | "responded" | "external_resolution" = "clear";
  if (disputedValue > 0) disputeStatus = "open";
  if (disputedValue > 0 && disputeResponseSubmitted) disputeStatus = "responded";
  if (disputeResolvedExternally) disputeStatus = "external_resolution";

  return {
    disputedValue,
    undisputedApprovedValue,
    remainingUndisputedReleasableValue,
    disputeStatus,
  };
}

export function deriveAuthorisedReleaseValue(item: ActionFeedItem) {
  if (item.releaseDecision === "released") return 0;
  if (deriveEvidenceStatus(item) !== "clear") return 0;

  const approvalsComplete = item.requiredApprovals.every((approvalId) => item.completedApprovals.includes(approvalId));
  if (item.status !== "approved" && !approvalsComplete) return 0;

  const disputeContext = deriveDisputeContext(item);
  const cappedValue = Math.min(item.availableFunds, disputeContext.remainingUndisputedReleasableValue);

  if (item.fundingStatus === "locked") return 0;
  if ((item.fundingStatus === "funding_gap" || item.availableFunds < item.requiredFunds) && deriveReleaseDecision(item) !== "partial_release") {
    return 0;
  }

  return Math.max(0, cappedValue);
}

export function deriveReleaseSummary(item: ActionFeedItem) {
  const releaseContext = deriveReleaseContext(item);
  if (releaseContext.releaseStatus === "released") return "Funds released";
  if (releaseContext.releaseStatus === "partial_released") return "Partial release completed";
  if (releaseContext.releaseBlockedReason) return releaseContext.releaseBlockedReason;
  if (deriveEvidenceStatus(item) !== "clear") return "Release blocked by incomplete evidence";
  const decision = deriveReleaseDecision(item);
  switch (decision) {
    case "ready":
      return "Authorised release available";
    case "blocked_dispute":
      return "Approved funding less disputed value";
    case "blocked_funding":
      return "Release blocked by funding gap";
    case "blocked_approval":
      return "Release blocked pending approval";
    case "partial_release":
      return "Partial release of undisputed value available";
    case "released":
      return "Funds released";
    default:
      return "Approved funding less disputed value";
  }
}

export function deriveUrgency(item: ActionFeedItem): NextRequiredAction["urgency"] {
  const decision = deriveReleaseDecision(item);
  const fundingContext = deriveFundingAssuranceContext(item);
  if (deriveEvidenceStatus(item) !== "clear") return "critical";
  if (
    (item.dispute.isActive && item.disputedValue > 0 && decision === "blocked_dispute") ||
    decision === "blocked_funding" ||
    fundingContext.fundingStatus === "blocked" ||
    item.fundingStatus === "locked"
  ) {
    return "critical";
  }
  if (fundingContext.fundingStatus === "warning") return "high";
  if ((decision === "ready" || decision === "partial_release") && item.requiresAction) return "critical";
  if ((!item.isRead && item.requiresAction) || decision === "blocked_approval") return "high";
  return "normal";
}

export function deriveNextRequiredAction(item: ActionFeedItem, userId = currentUserId): NextRequiredAction {
  const currentUserRole = getUserWorkflowRole(item, userId);
  const releaseContext = deriveReleaseContext(item, currentUserRole);
  const disputeContext = deriveDisputeContext(item);
  const fundingContext = deriveFundingAssuranceContext(item);
  const evidenceStatus = deriveEvidenceStatus(item);
  const approvalsComplete = item.requiredApprovals.every((approvalId) => item.completedApprovals.includes(approvalId));
  const approvalStatus = item.status === "approved" || approvalsComplete ? "approved" : "pending";
  const dominantAction = resolveDominantAction({
    fundingStatus: fundingContext.fundingStatus,
    evidenceStatus,
    disputeStatus: disputeContext.disputeStatus,
    approvalStatus,
    releaseStatus: releaseContext.releaseStatus,
    releaseRemaining: releaseContext.remainingReleasableValue,
    disputeReason: item.dispute.reason,
  });
  const dominantActionWithOwner = {
    ...dominantAction,
    ownerRole: getDominantOwnerRole(dominantAction.type, item, disputeContext.disputeStatus),
    ownerAuthority: getDominantOwnerAuthority(dominantAction.type, item, disputeContext.disputeStatus),
    authorityActionType: getDominantAuthorityAction(dominantAction.type, item, disputeContext.disputeStatus),
  };

  const resolvedAction: NextRequiredAction = {
    ...dominantActionWithOwner,
    urgency: dominantActionWithOwner.priority === "critical" ? "critical" : dominantActionWithOwner.priority === "high" ? "high" : "normal",
  };

  return withAuthorityGate(item, currentUserRole, resolvedAction);
}

export function deriveMessageMeta(message: ThreadMessage, _item: ActionFeedItem) {
  const authoredForLabel = message.authoredForRole ? `Sent to ${formatAuthorityRole(message.authoredForRole)}` : undefined;
  const visibilityLabel = message.visibility === "internal_note" ? "Internal note" : authoredForLabel ?? "Public thread";
  const intentLabel =
    message.actionIntent === "clarification"
      ? "Clarification request"
      : message.actionIntent === "evidence"
        ? "Evidence response"
        : message.actionIntent === "resolution_note"
          ? "Resolution note"
          : undefined;
  const statusLabel = message.deliveryStatus === "updated" ? "Updated" : message.deliveryStatus === "draft" ? "Draft" : intentLabel;

  return {
    visibilityLabel,
    authoredForLabel,
    statusLabel,
  };
}

export function deriveEvidencePackage(item: ActionFeedItem): EvidencePackage {
  const emptyPackage: EvidencePackage = {
    images: [],
    files: [],
    plans: [],
    contracts: [],
    regulations: [],
  };
  const fromThreads = Object.values(item.sections).flatMap((section) =>
    (section?.messages ?? []).flatMap((message) => message.attachments ?? []),
  );
  const source = [...fromThreads, ...(item.evidencePackage ? Object.values(item.evidencePackage).flat() : [])];
  const seen = new Set<string>();

  return source.reduce((packageByType, attachment) => {
    if (seen.has(attachment.id)) return packageByType;
    seen.add(attachment.id);
    const bucket = getEvidenceBucket(attachment);
    return {
      ...packageByType,
      [bucket]: [...packageByType[bucket], attachment],
    };
  }, emptyPackage);
}

export function deriveEvidenceCounts(item: ActionFeedItem) {
  const evidencePackage = deriveEvidencePackage(item);
  const counts = {
    images: evidencePackage.images.length,
    files: evidencePackage.files.length,
    plans: evidencePackage.plans.length,
    contracts: evidencePackage.contracts.length,
    regulations: evidencePackage.regulations.length,
  };

  return {
    ...counts,
    total: Object.values(counts).reduce((total, count) => total + count, 0),
  };
}

export function deriveEvidenceStatus(stage: Pick<ActionFeedItem, "requiredEvidence" | "submittedEvidence" | "evidencePackage" | "sections">) {
  const required = stage.requiredEvidence || [];
  const submitted = stage.submittedEvidence || [];

  if (!required.length) return "clear" as const;

  const missing = required.filter(
    (req) => !submitted.some((sub) => sub.type === req),
  );

  if (missing.length === 0) return "clear" as const;
  if (submitted.length > 0) return "partial" as const;
  return "missing" as const;
}

export function deriveMissingEvidence(stage: Pick<ActionFeedItem, "requiredEvidence" | "submittedEvidence" | "evidencePackage" | "sections">) {
  const required = stage.requiredEvidence || [];
  const submitted = stage.submittedEvidence || [];
  return required.filter((req) => !submitted.some((sub) => sub.type === req));
}

export function filterEvidencePackage(item: ActionFeedItem, evidenceFilter: EvidenceFilter) {
  const evidencePackage = deriveEvidencePackage(item);
  if (evidenceFilter === "all") return evidencePackage;
  return {
    images: evidenceFilter === "images" ? evidencePackage.images : [],
    files: evidenceFilter === "files" ? evidencePackage.files : [],
    plans: evidenceFilter === "plans" ? evidencePackage.plans : [],
    contracts: evidenceFilter === "contracts" ? evidencePackage.contracts : [],
    regulations: evidenceFilter === "regulations" ? evidencePackage.regulations : [],
  };
}

export function deriveApprovalChain(item: ActionFeedItem): ApprovalChainStep[] {
  if (item.approvalChain?.length) return item.approvalChain;

  return item.requiredApprovals.map((actorId, index) => {
    const permission = item.contractContext.permissions[actorId] ?? formatAuthorityRole(getAuthorityForUser(item, actorId));
    const history = item.approvalHistory.find((event) => event.actorId === actorId);
    const complete = item.completedApprovals.includes(actorId);
    const current = !complete && item.currentAuthority === getAuthorityForUser(item, actorId);
    return {
      stepId: `${item.id}-approval-step-${index}`,
      role: permission,
      actorId,
      status: history?.decision === "rejected" ? "rejected" : complete ? "complete" : current ? "current" : "upcoming",
      decision: history?.decision,
      timestamp: history?.timestamp,
      note: history?.note,
    };
  });
}

export function canCurrentUserRelease(item: ActionFeedItem, currentUserId: string) {
  const decision = deriveReleaseDecision(item);
  if (deriveEvidenceStatus(item) !== "clear") return false;
  const hasTreasuryAuthority = item.currentAuthority === "treasury" || hasWorkflowAuthority({
    userRole: getUserWorkflowRole(item, currentUserId),
    actionType: "release",
  });
  return hasTreasuryAuthority && (decision === "ready" || decision === "partial_release");
}

export function deriveDisputeResolutionPath(item: ActionFeedItem) {
  const decision = deriveReleaseDecision(item);
  if (decision === "released") {
    return {
      currentStageLabel: "Fully released",
      finalOutcomeLabel: "Funds released",
    };
  }

  if (decision === "partial_release") {
    return {
      currentStageLabel: "Treasury hold",
      nextStageLabel: "Commercial review",
      finalOutcomeLabel: "Resolution agreed",
      blockerLabel: "Active disputed value held pending clarification",
    };
  }

  if (item.dispute.isActive) {
    return {
      currentStageLabel:
        item.currentAuthority === "qs"
          ? "QS review"
          : item.currentAuthority === "contractor"
            ? "Contractor response"
            : item.currentAuthority === "client"
              ? "Commercial review"
              : "Treasury hold",
      nextStageLabel: item.currentAuthority === "contractor" ? "Commercial review" : "Contractor response",
      finalOutcomeLabel: "Resolution agreed",
      blockerLabel: item.dispute.reason || "Active disputed value held pending clarification",
    };
  }

  return {
    currentStageLabel: formatAuthorityRole(item.currentAuthority),
    nextStageLabel: decision === "blocked_approval" ? "Approval chain completion" : undefined,
    finalOutcomeLabel: item.isResolved ? "Resolved" : "Fully released",
    blockerLabel: decision.startsWith("blocked_") ? deriveReleaseSummary(item) : undefined,
  };
}

export function deriveStateSummary(item: ActionFeedItem) {
  const releaseContext = deriveReleaseContext(item);
  const disputeContext = deriveDisputeContext(item);
  const fundingContext = deriveFundingAssuranceContext(item);
  if (disputeContext.disputeStatus === "external_resolution") return { shortLabel: "External resolution", detailLabel: "Dispute resolution recorded", tone: "positive" as const };
  if (disputeContext.disputeStatus === "responded") return { shortLabel: "Dispute response", detailLabel: "Dispute response needs review", tone: "warning" as const };
  if (disputeContext.disputeStatus === "open") return { shortLabel: "In dispute", detailLabel: "Disputed value held", tone: "warning" as const };
  if (fundingContext.fundingStatus === "blocked") return { shortLabel: "Funding shortfall", detailLabel: "Insufficient 30-day cover", tone: "warning" as const };
  if (fundingContext.fundingStatus === "warning") return { shortLabel: "At risk", detailLabel: "Reserve shortfall", tone: "warning" as const };
  if (releaseContext.releaseStatus === "released") return { shortLabel: "Released", detailLabel: "Funds released", tone: "positive" as const };
  if (releaseContext.releaseStatus === "partial_released") return { shortLabel: "Part released", detailLabel: "Remaining release still controlled", tone: "warning" as const };
  if (releaseContext.releaseStatus === "ready") return { shortLabel: "Release ready", detailLabel: "Treasury confirmation required", tone: "neutral" as const };
  const decision = deriveReleaseDecision(item);
  if (deriveEvidenceStatus(item) !== "clear") return { shortLabel: "Evidence incomplete", detailLabel: "Required evidence missing", tone: "warning" as const };
  if (item.isResolved) return { shortLabel: "Resolved", detailLabel: "Completed or closed", tone: "positive" as const };
  if (decision === "blocked_funding") return { shortLabel: "Blocked by funding gap", detailLabel: deriveReleaseSummary(item), tone: "warning" as const };
  if (decision === "blocked_dispute" || item.dispute.isActive) return { shortLabel: "Blocked by active dispute", detailLabel: deriveReleaseSummary(item), tone: "warning" as const };
  if (decision === "partial_release") return { shortLabel: "Partial release available", detailLabel: "Undisputed value can move", tone: "warning" as const };
  if (decision === "ready") return { shortLabel: "Awaiting treasury release", detailLabel: "Approved and funded", tone: "neutral" as const };
  return { shortLabel: `Awaiting ${formatAuthorityRole(item.currentAuthority).toLowerCase()}`, detailLabel: deriveNextRequiredAction(item).label, tone: "neutral" as const };
}

export function deriveExpandedTopSummary(item: ActionFeedItem) {
  const nextAction = deriveNextRequiredAction(item);
  const state = deriveStateSummary(item);
  const resolutionPath = deriveDisputeResolutionPath(item);
  const releaseSummary = deriveReleaseSummary(item);

  return {
    stateLabel: state.shortLabel,
    stateTone: state.tone,
    nextActionLabel: nextAction.label,
    nextActionReason: item.dispute.isActive && nextAction.reason.toLowerCase().startsWith("dispute active")
      ? item.dispute.reason || "Disputed value remains held pending clarification."
      : nextAction.reason,
    currentPath: resolutionPath.currentStageLabel,
    nextPath: resolutionPath.nextStageLabel,
    blocker: resolutionPath.blockerLabel,
    outcome: resolutionPath.finalOutcomeLabel,
    releaseText: releaseSummary,
  };
}

export function deriveRowPrimaryAction(item: ActionFeedItem) {
  if (deriveEvidenceStatus(item) !== "clear") return "Evidence incomplete";
  if (item.type === "dispute" || item.dispute.isActive) return "Dispute requires review";
  return item.actionRequired || item.actionLabel || "Action required";
}

export function deriveRowNextAction(item: ActionFeedItem) {
  const nextAction = deriveNextRequiredAction(item);
  const label = (nextAction.nextAction ?? nextAction.label)
    .replace("Funding shortfall to resolve", "Resolve funding shortfall")
    .replace("Review funding cover", "Resolve funding")
    .replace("Treasury release available", "Treasury release")
    .replace("Contractor response required", "Contractor response")
    .replace("QS review required", "QS review")
    .replace("Partial release available", "Partial release")
    .replace("Approval required", "Approval")
    .replace("Upload evidence", "Upload evidence")
    .replace("Evidence incomplete", "Upload evidence");
  return `Next: ${label}`;
}

export function deriveRowStateLabel(item: ActionFeedItem) {
  const disputeStatus = deriveDisputeContext(item).disputeStatus;
  if (disputeStatus === "external_resolution") return "External resolution";
  if (disputeStatus === "responded") return "Dispute response";
  if (disputeStatus === "open") return "In dispute";
  const fundingStatus = deriveFundingAssuranceContext(item).fundingStatus;
  if (fundingStatus === "blocked") return "Blocked";
  if (fundingStatus === "warning") return "At risk";
  const releaseStatus = deriveReleaseContext(item).releaseStatus;
  if (releaseStatus === "released") return "Released";
  if (releaseStatus === "partial_released") return "Part released";
  if (releaseStatus === "ready") return "Release ready";
  const state = deriveStateSummary(item).shortLabel;
  if (state.includes("Blocked")) return "Blocked";
  if (state.includes("Partial")) return "Partial release";
  if (state === "Released") return "Released";
  if (state === "Resolved") return "Resolved";
  if (state.includes("treasury release")) return "Awaiting release";
  if (state.includes("Awaiting")) return "Awaiting review";
  return state;
}

export function deriveRowOwnerLabel(item: ActionFeedItem) {
  const owner = deriveNextRequiredAction(item).ownerAuthority;
  if (owner === "qs") return "QS";
  if (owner === "contractor") return "Contractor";
  if (owner === "client") return "Commercial";
  if (owner === "treasury") return "Treasury";
  return "System";
}

export function deriveRowIconSet(item: ActionFeedItem) {
  const decision = deriveReleaseDecision(item);
  const releaseStatus = deriveReleaseContext(item).releaseStatus;
  return {
    dispute: item.dispute.isActive || item.type === "dispute",
    release: releaseStatus === "ready" || releaseStatus === "released" || decision === "ready" || decision === "released",
    partial: releaseStatus === "partial_released" || decision === "partial_release",
    pending: Boolean(item.timeSensitive && item.requiresAction && releaseStatus !== "released" && decision !== "released"),
  };
}

export function deriveTimelineRows(item: ActionFeedItem) {
  const activityRows = item.activity.map((event) => ({
    id: event.id,
    kind: "activity" as const,
    actorLabel: item.contractContext.contacts[event.actorId]?.name ?? formatId(event.actorId),
    primaryText: event.text,
    secondaryText: formatActivityType(event.type),
    timestamp: event.timestamp,
    emphasis: event.type.includes("dispute") || event.type === "approval_returned"
      ? ("warning" as const)
      : event.type.includes("approval") || event.type.includes("certification") || event.type.includes("payment") || event.type === "funding"
        ? ("positive" as const)
        : ("normal" as const),
  }));
  const approvalRows = item.approvalHistory.map((event) => ({
    id: event.id,
    kind: "approval" as const,
    actorLabel: item.contractContext.contacts[event.actorId]?.name ?? formatId(event.actorId),
    primaryText: event.decision.replace("_", " "),
    secondaryText: event.note,
    timestamp: event.timestamp,
    emphasis: event.decision === "approved" ? ("positive" as const) : event.decision === "rejected" ? ("warning" as const) : ("normal" as const),
  }));

  return [...activityRows, ...approvalRows].sort((a, b) => b.timestamp - a.timestamp);
}

export function escalateNotification(
  itemId: string,
  fromAuthority: WorkflowAuthority,
  toAuthority: WorkflowAuthority,
  reason: string,
  actorId: string,
  item = getActionFeedItem(itemId),
) {
  if (!item) return null;
  if (!hasWorkflowAuthority({ userRole: getUserWorkflowRole(item, actorId), actionType: "escalate" })) {
    return appendActivityEventToItem(item, {
      id: `${itemId}-activity-${Date.now()}`,
      type: "status_change",
      actorId,
      text: "Escalation blocked: insufficient authority.",
      timestamp: Date.now(),
    });
  }
  const allowed = item.dispute.isActive || deriveReleaseDecision(item).startsWith("blocked_");
  if (!allowed) return item;

  return appendActivityEventToItem({
    ...item,
    currentAuthority: toAuthority,
    requiresAction: true,
    escalation: {
      isEscalated: true,
      escalatedFrom: fromAuthority,
      escalatedTo: toAuthority,
      reason,
      timestamp: Date.now(),
    },
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "workflow_escalated",
    actorId,
    text: `Dispute escalated from ${formatAuthorityRole(fromAuthority)} to ${formatAuthorityRole(toAuthority)}${reason ? `: ${reason}` : "."}`,
    reason,
    timestamp: Date.now(),
  });
}

export function reassignNotificationOwner(
  itemId: string,
  previousOwnerId: string,
  currentOwnerId: string,
  reason: string,
  actorId: string,
  item = getActionFeedItem(itemId),
) {
  if (!item) return null;
  if (!hasWorkflowAuthority({ userRole: getUserWorkflowRole(item, actorId), actionType: "reassign" })) {
    return appendActivityEventToItem(item, {
      id: `${itemId}-activity-${Date.now()}`,
      type: "status_change",
      actorId,
      text: "Reassignment blocked: insufficient authority.",
      timestamp: Date.now(),
    });
  }
  const ownerName = item.contractContext.contacts[currentOwnerId]?.name ?? formatId(currentOwnerId);

  return appendActivityEventToItem({
    ...item,
    requiresAction: true,
    reassignment: {
      currentOwnerId,
      previousOwnerId,
      reassignedBy: actorId,
      reason,
      timestamp: Date.now(),
    },
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "workflow_reassigned",
    actorId,
    text: `Ownership reassigned to ${ownerName}${reason ? `: ${reason}` : "."}`,
    reason,
    assignee: currentOwnerId,
    timestamp: Date.now(),
  });
}

export function derivePostReleaseState(item: ActionFeedItem): ActionFeedItem {
  const current = hydrateReleaseFields(item);
  if (current.releaseDecision === "released") {
    return {
      ...current,
      currentAuthority: "system",
      requiresAction: false,
      isResolved: true,
    };
  }

  if (current.releaseDecision === "partial_release") {
    return {
      ...current,
      currentAuthority: current.dispute.isActive ? current.currentAuthority : "treasury",
      requiresAction: current.dispute.isActive,
      isResolved: false,
    };
  }

  return current;
}

export function deriveFundingShortfall(item: ActionFeedItem) {
  return deriveFundingAssuranceContext(item).fundingGap;
}

export function deriveFundingAssuranceContext(stage: Partial<ActionFeedItem>) {
  const projectedWip30Days = Math.max(0, stage.projectedWip30Days ?? stage.requiredFunds ?? 0);
  const reserveBuffer = Math.max(0, stage.reserveBuffer ?? 0);
  const totalRequiredWithBuffer = projectedWip30Days + reserveBuffer;
  const ringfencedFunds = Math.max(0, stage.ringfencedFunds ?? 0);
  const allocatedFunds = Math.max(0, stage.allocatedFunds ?? stage.availableFunds ?? 0);
  const availableFundingCover = ringfencedFunds > 0 ? ringfencedFunds : allocatedFunds;
  const fundingGap = Math.max(0, totalRequiredWithBuffer - availableFundingCover);

  let fundingStatus: FundingAssuranceStatus = "clear";
  if (fundingGap > 0 && availableFundingCover > 0) fundingStatus = "warning";
  if (availableFundingCover <= 0 || fundingGap >= totalRequiredWithBuffer) fundingStatus = "blocked";

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

export function deriveReleaseContext(stage: ActionFeedItem, currentUserRole = getUserWorkflowRole(stage, currentUserId)) {
  const approvedValue = stage.approvedValue ?? 0;
  const disputeContext = deriveDisputeContext(stage);
  const disputedValue = disputeContext.disputedValue;
  const releasedValue = stage.releasedValue ?? 0;
  const authorisedReleaseValue = disputeContext.undisputedApprovedValue;
  const remainingReleasableValue = disputeContext.remainingUndisputedReleasableValue;
  const fundingContext = deriveFundingAssuranceContext(stage);
  const evidenceStatus = deriveEvidenceStatus(stage);
  const fundingStatus = fundingContext.fundingStatus;
  const approvalStatus = stage.status === "approved" ? "approved" : "pending";
  const hasTreasuryAuthority = hasWorkflowAuthority({ userRole: currentUserRole, actionType: "release" });

  let releaseBlockedReason = "";
  if (remainingReleasableValue === 0 && authorisedReleaseValue > 0) releaseBlockedReason = "Nothing left to release";
  else if (evidenceStatus !== "clear") releaseBlockedReason = "Evidence incomplete";
  else if (fundingStatus === "warning") releaseBlockedReason = "Reserve shortfall";
  else if (fundingStatus === "blocked") releaseBlockedReason = "Funding shortfall";
  else if (approvalStatus !== "approved") releaseBlockedReason = "Approval required";
  else if (!hasTreasuryAuthority) releaseBlockedReason = "Treasury authority required";
  else if (disputeContext.disputeStatus === "open" && disputedValue > 0) releaseBlockedReason = "Awaiting dispute response";

  const isReleaseBlocked = Boolean(releaseBlockedReason && releaseBlockedReason !== "Nothing left to release");
  let releaseStatus: ReleaseStatus = "blocked";
  if (remainingReleasableValue === 0 && authorisedReleaseValue > 0) releaseStatus = "released";
  else if (!isReleaseBlocked && remainingReleasableValue > 0 && releasedValue > 0) releaseStatus = "partial_released";
  else if (!isReleaseBlocked && remainingReleasableValue > 0 && releasedValue === 0) releaseStatus = "ready";

  return {
    approvedValue,
    disputedValue,
    releasedValue,
    authorisedReleaseValue,
    remainingReleasableValue,
    releaseStatus,
    isReleaseBlocked,
    releaseBlockedReason,
  };
}

export function hydrateReleaseFields(item: ActionFeedItem): ActionFeedItem {
  const releaseContext = deriveReleaseContext(item);
  const releaseDecision = releaseContext.releaseStatus === "released" ? "released" : deriveReleaseDecision(item);
  const releaseEligibleValue = releaseContext.isReleaseBlocked ? 0 : Math.min(item.availableFunds, releaseContext.remainingReleasableValue);
  const fundingShortfall = deriveFundingShortfall(item);
  const fundingContext = deriveFundingAssuranceContext(item);

  return {
    ...item,
    releaseDecision,
    releaseEligibleValue,
    releasedValue: releaseContext.releasedValue,
    authorisedReleaseValue: releaseContext.authorisedReleaseValue,
    remainingReleasableValue: releaseContext.remainingReleasableValue,
    fundingShortfall,
    projectedWip30Days: fundingContext.projectedWip30Days,
    reserveBuffer: fundingContext.reserveBuffer,
    totalRequiredWithBuffer: fundingContext.totalRequiredWithBuffer,
    ringfencedFunds: fundingContext.ringfencedFunds,
    allocatedFunds: fundingContext.allocatedFunds,
    availableFundingCover: fundingContext.availableFundingCover,
    fundingGap: fundingContext.fundingGap,
    releaseStatus: releaseContext.releaseStatus,
    isReleaseBlocked: releaseContext.isReleaseBlocked || releaseDecision.startsWith("blocked_"),
    releaseBlockedReason: releaseContext.releaseBlockedReason,
  };
}

export function releasePayment(itemId: string, item = getActionFeedItem(itemId), actorId = currentUserId, actorRole?: string) {
  if (!item) return null;

  const current = hydrateReleaseFields(item);
  const resolvedActorRole = actorRole ?? getUserWorkflowRole(current, actorId);
  if (current.releaseStatus !== "ready" && current.releaseStatus !== "partial_released") return current;

  const releaseAmount = Math.min(current.remainingReleasableValue, current.availableFunds);
  if (releaseAmount <= 0) return current;

  const nextReleasedValue = current.releasedValue + releaseAmount;
  const nextRemainingReleasableValue = Math.max(0, current.authorisedReleaseValue - nextReleasedValue);
  const nextAvailableFunds = Math.max(0, current.availableFunds - releaseAmount);
  const nextFundingStatus: FundingStatus =
    nextAvailableFunds === 0
      ? current.fundingStatus
      : nextAvailableFunds < current.requiredFunds
        ? "part_funded"
        : "funded";
  const nextReleaseDecision: ReleaseDecision = nextRemainingReleasableValue === 0 ? "released" : current.releaseDecision;

  return appendActivityEventToItem(derivePostReleaseState({
    ...current,
    releasedValue: nextReleasedValue,
    remainingReleasableValue: nextRemainingReleasableValue,
    availableFunds: nextAvailableFunds,
    fundingStatus: nextFundingStatus,
    releaseDecision: nextReleaseDecision,
    releaseStatus: nextRemainingReleasableValue === 0 ? "released" : "partial_released",
    requiresAction: nextRemainingReleasableValue === 0 ? false : current.requiresAction,
  }), {
    id: `${itemId}-activity-${Date.now()}`,
    type: nextRemainingReleasableValue === 0 ? "payment_released" : "payment_partially_released",
    actorId,
    text: nextRemainingReleasableValue === 0
      ? "Fully approved value released; package moved to complete state."
      : "Undisputed approved value released; disputed balance remains held.",
    approvedValue: current.approvedValue,
    disputedValue: current.disputedValue,
    authorisedReleaseValue: current.authorisedReleaseValue,
    releasedValue: nextReleasedValue,
    releaseAmount,
    remainingReleasableValue: nextRemainingReleasableValue,
    actor: actorId,
    actorRole: resolvedActorRole,
    timestamp: Date.now(),
  });
}

export function markNotificationRead(itemId: string, isRead: boolean, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  if (item.isRead === isRead) return item;
  return appendActivityEventToItem({ ...item, isRead }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "status_change",
    actorId: currentUserId,
    text: isRead ? "Notification marked read." : "Notification marked unread.",
    timestamp: Date.now(),
  });
}

export function setNotificationResolved(itemId: string, isResolved: boolean, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  if (isResolved) {
    const decision = deriveReleaseDecision(item);
    const hasMandatoryApprovalStep = deriveApprovalChain(item).some((step) => step.status === "current" || step.status === "upcoming");
    const blockedDecision = decision === "blocked_approval" || decision === "blocked_dispute" || decision === "blocked_funding";
    if (item.dispute.isActive || blockedDecision || hasMandatoryApprovalStep) {
      return appendActivityEventToItem(item, {
        id: `${itemId}-activity-${Date.now()}`,
        type: "status_change",
        actorId: currentUserId,
        text: item.dispute.isActive
          ? "Resolve blocked: active dispute remains open."
          : blockedDecision
            ? `Resolve blocked: ${deriveReleaseSummary(item).toLowerCase()}.`
            : "Resolve blocked: mandatory approval chain is not complete.",
        timestamp: Date.now(),
      });
    }
  }
  return appendActivityEventToItem({
    ...item,
    isResolved,
    requiresAction: isResolved ? false : true,
  }, {
    id: `${itemId}-activity-${Date.now()}`,
    type: "status_change",
    actorId: currentUserId,
    text: isResolved ? "Notification resolved." : "Notification reopened.",
    timestamp: Date.now(),
  });
}

export function saveDraft(itemId: string, sectionKey: "qs" | "contractor" | "activity", draftState: DraftState, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  return {
    ...item,
    drafts: {
      ...item.drafts,
      [sectionKey]: draftState,
    },
  };
}

export function deleteDraft(itemId: string, sectionKey: "qs" | "contractor" | "activity", item = getActionFeedItem(itemId)) {
  if (!item) return null;
  const { [sectionKey]: _removed, ...drafts } = item.drafts;
  return {
    ...item,
    drafts,
  };
}

export function appendThreadMessage(itemId: string, sectionKey: "qs" | "contractor", message: ThreadMessage, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  return {
    ...item,
    disputeResponseSubmitted: item.disputeResponseSubmitted || Boolean(item.dispute.isActive && sectionKey === "contractor"),
    sections: {
      ...item.sections,
      [sectionKey]: {
        messages: [...(item.sections[sectionKey]?.messages ?? []), message],
      },
    },
  };
}

export function appendActivityEvent(itemId: string, event: ActivityEvent, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  return appendActivityEventToItem(item, event);
}

export function appendApprovalHistory(itemId: string, event: ApprovalHistoryEvent, item = getActionFeedItem(itemId)) {
  if (!item) return null;
  return appendApprovalHistoryToItem(item, event);
}

function appendActivityEventToItem(item: ActionFeedItem, event: ActivityEvent) {
  const actorRole = event.actorRole ?? getUserWorkflowRole(item, event.actorId);
  const normalizedEvent = {
    ...getAuditEventBase(item, actorRole, { id: event.actor ?? event.actorId }),
    ...event,
    actor: event.actor ?? event.actorId,
    actorRole,
  };

  return {
    ...item,
    activity: [...item.activity, normalizedEvent],
  };
}

function appendApprovalHistoryToItem(item: ActionFeedItem, event: ApprovalHistoryEvent) {
  return {
    ...item,
    approvalHistory: [...item.approvalHistory, event],
  };
}

function getNextAuthority(item: ActionFeedItem, completedApprovals: string[]) {
  const nextApprover = item.requiredApprovals.find((approvalId) => !completedApprovals.includes(approvalId));
  return nextApprover ? getAuthorityForUser(item, nextApprover) : item.currentAuthority;
}

function getAuthorityForUser(item: ActionFeedItem, userId: string): WorkflowAuthority {
  const permission = item.contractContext.permissions[userId]?.toLowerCase() ?? "";
  if (permission.includes("quantity surveyor") || permission.includes("qs")) return "qs";
  if (permission.includes("contractor")) return "contractor";
  if (permission.includes("client")) return "client";
  return "treasury";
}

function formatActivityType(type: ActivityEvent["type"]) {
  switch (type) {
    case "evidence_submitted":
      return "Evidence submitted";
    case "evidence_updated":
      return "Evidence updated";
    case "certification_completed":
      return "Certified";
    case "approval_completed":
      return "Approved";
    case "approval_returned":
      return "Returned";
    case "clarification_requested":
      return "Clarification requested";
    case "dispute_raised":
      return "Dispute raised";
    case "dispute_responded":
      return "Dispute response";
    case "dispute_marked_external_resolution":
      return "Dispute resolved";
    case "workflow_escalated":
      return "Escalated";
    case "workflow_reassigned":
      return "Reassigned";
    case "release_confirmation_started":
      return "Release confirmation started";
    case "payment_released":
      return "Payment released";
    case "payment_partially_released":
      return "Partial payment released";
    default:
      return type.replace(/_/g, " ");
  }
}

export function getUserWorkflowRole(item: ActionFeedItem, userId: string) {
  const permission = item.contractContext.permissions[userId];
  if (permission) return normaliseWorkflowRole(permission);
  return normaliseWorkflowRole(item.contractContext.contacts[userId]?.name);
}

function mapAuthorityToActionType(authority: WorkflowAuthority): WorkflowAuthorityAction {
  if (authority === "qs") return "certify";
  if (authority === "contractor") return "submit_evidence";
  if (authority === "client") return "approve";
  if (authority === "treasury") return "release";
  return "reassign";
}

function resolveDominantAction({
  fundingStatus,
  evidenceStatus,
  disputeStatus,
  approvalStatus,
  releaseStatus,
  releaseRemaining,
  disputeReason,
}: {
  fundingStatus: FundingAssuranceStatus;
  evidenceStatus: ReturnType<typeof deriveEvidenceStatus>;
  disputeStatus: ReturnType<typeof deriveDisputeContext>["disputeStatus"];
  approvalStatus: "approved" | "pending";
  releaseStatus: ReleaseStatus;
  releaseRemaining: number;
  disputeReason?: string;
}) {
  if (fundingStatus === "blocked") {
    return {
      type: "funding_block" as const,
      priority: "critical" as const,
      label: "Funding shortfall",
      nextAction: "Resolve funding",
      blocked: true,
      reason: "Funding cover is insufficient for this stage.",
    };
  }

  if (evidenceStatus !== "clear") {
    return {
      type: "evidence_required" as const,
      priority: "critical" as const,
      label: "Evidence incomplete",
      nextAction: "Upload evidence",
      blocked: true,
      reason: "Required evidence is missing before this stage can complete.",
    };
  }

  if (disputeStatus === "open" || disputeStatus === "responded") {
    return {
      type: "dispute_active" as const,
      priority: "high" as const,
      label: "Dispute active",
      nextAction: "Respond to dispute",
      blocked: false,
      reason: disputeReason || "Disputed value is isolated from release until reviewed.",
    };
  }

  if (approvalStatus !== "approved") {
    return {
      type: "approval_required" as const,
      priority: "high" as const,
      label: "Approval required",
      nextAction: "Approve stage",
      blocked: false,
      reason: "Approval chain is not complete.",
    };
  }

  if (releaseStatus !== "blocked" && releaseRemaining > 0) {
    return {
      type: "release_ready" as const,
      priority: "high" as const,
      label: "Release ready",
      nextAction: "Confirm release",
      blocked: false,
      reason: "Approval, evidence, dispute, and funding gates are clear.",
    };
  }

  return {
    type: "info" as const,
    priority: "low" as const,
    label: "No action",
    nextAction: "",
    blocked: false,
    reason: "No workflow action is currently required.",
  };
}

function getDominantOwnerRole(
  type: NonNullable<NextRequiredAction["type"]>,
  item: ActionFeedItem,
  disputeStatus: ReturnType<typeof deriveDisputeContext>["disputeStatus"],
) {
  if (type === "funding_block" || type === "release_ready") return "Treasury";
  if (type === "evidence_required") return "Contractor";
  if (type === "dispute_active") return disputeStatus === "open" ? "Contractor" : "Quantity Surveyor";
  if (type === "approval_required") return formatAuthorityRole(item.currentAuthority);
  return item.isResolved ? "System" : formatAuthorityRole(item.currentAuthority);
}

function getDominantOwnerAuthority(
  type: NonNullable<NextRequiredAction["type"]>,
  item: ActionFeedItem,
  disputeStatus: ReturnType<typeof deriveDisputeContext>["disputeStatus"],
): WorkflowAuthority {
  if (type === "funding_block" || type === "release_ready") return "treasury";
  if (type === "evidence_required") return "contractor";
  if (type === "dispute_active") return disputeStatus === "open" ? "contractor" : "qs";
  if (type === "approval_required") return item.currentAuthority;
  return item.isResolved ? "system" : item.currentAuthority;
}

function getDominantAuthorityAction(
  type: NonNullable<NextRequiredAction["type"]>,
  item: ActionFeedItem,
  disputeStatus: ReturnType<typeof deriveDisputeContext>["disputeStatus"],
): WorkflowAuthorityAction | undefined {
  if (type === "funding_block" || type === "release_ready") return "release";
  if (type === "evidence_required") return "submit_evidence";
  if (type === "dispute_active") return disputeStatus === "open" ? "dispute" : "certify";
  if (type === "approval_required") return mapAuthorityToActionType(item.currentAuthority);
  return undefined;
}

function withAuthorityGate(item: ActionFeedItem, userRole: string, action: NextRequiredAction): NextRequiredAction {
  if (!action.authorityActionType) return action;
  const canAct = hasWorkflowAuthority({
    userRole,
    actionType: action.authorityActionType,
  });
  if (canAct) return action;

  const authorisedActorAvailable = Object.keys(item.contractContext.permissions).some((contactId) =>
    hasWorkflowAuthority({
      userRole: getUserWorkflowRole(item, contactId),
      actionType: action.authorityActionType as WorkflowAuthorityAction,
    }),
  );

  if (!authorisedActorAvailable) {
    return {
      type: "authority_required",
      priority: "high",
      label: "Authorisation required",
      ownerRole: action.ownerRole,
      ownerAuthority: action.ownerAuthority,
      urgency: "high",
      reason: "This step requires a permitted role.",
      nextAction: "Reassign or escalate",
      blocked: true,
      blockedReason: "Insufficient authority",
      authorityActionType: action.authorityActionType,
    } as NextRequiredAction;
  }

  return {
    ...action,
    blocked: true,
    blockedReason: "Insufficient authority",
    nextAction: "Reassign or escalate",
  };
}

function getEvidenceBucket(attachment: Attachment): keyof EvidencePackage {
  const name = attachment.name.toLowerCase();
  if (attachment.type === "image") return "images";
  if (name.includes("plan") || name.includes("drawing")) return "plans";
  if (name.includes("contract") || name.includes("scope") || name.includes("instruction")) return "contracts";
  if (name.includes("regulation") || name.includes("compliance")) return "regulations";
  return "files";
}

function deriveSubmittedEvidence(stage: Pick<ActionFeedItem, "evidencePackage" | "sections">) {
  const evidencePackage = deriveEvidencePackage({
    sections: stage.sections,
    evidencePackage: stage.evidencePackage,
  } as ActionFeedItem);
  const submitted: Array<{ type: EvidenceRequirementType; attachmentId?: string }> = [];
  evidencePackage.images.forEach((attachment) => submitted.push({ type: "image", attachmentId: attachment.id }));
  evidencePackage.files.forEach((attachment) => submitted.push({ type: "file", attachmentId: attachment.id }));
  evidencePackage.plans.forEach((attachment) => submitted.push({ type: "plan", attachmentId: attachment.id }));
  evidencePackage.contracts.forEach((attachment) => submitted.push({ type: "contract", attachmentId: attachment.id }));
  evidencePackage.regulations.forEach((attachment) => submitted.push({ type: "regulation", attachmentId: attachment.id }));
  return submitted;
}

export function formatAuthorityRole(authority: WorkflowAuthority) {
  switch (authority) {
    case "qs":
      return "Quantity Surveyor";
    case "contractor":
      return "Contractor";
    case "client":
      return "Commercial Approver";
    case "treasury":
      return "Treasury";
    default:
      return "System";
  }
}

function formatId(value: string) {
  return value
    .replace(/^contact-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getActionFeedItem(itemId: string) {
  return actionFeedItems.find((item) => item.id === itemId);
}
