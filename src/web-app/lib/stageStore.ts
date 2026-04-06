import { useSyncExternalStore } from "react";
import type { ActionType } from "@/lib/actionConfig";
import type { PriorityKey } from "@/lib/priorityConfig";
import type { StatusKey } from "@/lib/statusConfig";

export type UserRole = "delivery" | "professional" | "commercial" | "treasury" | "funder" | "admin";
export type ApprovalRole = "professional" | "commercial" | "treasury";
export type ApprovalDecision = "pending" | "approved" | "rejected";
export type ApprovalActionKey = "approve-professional" | "approve-commercial" | "approve-treasury";
export const approvalActionKeys: readonly ApprovalActionKey[] = [
  "approve-professional",
  "approve-commercial",
  "approve-treasury",
];
export type QueueActionKey =
  | ApprovalActionKey
  | "release-funding"
  | "add-funds"
  | "allocate-stage-funding"
  | "adjust-buffer"
  | "review-dispute"
  | "review-variation"
  | "review-evidence"
  | "review-audit"
  | "record-completion"
  | "mark-ready";

export type PermissionAction =
  | "create-contract"
  | "amend-contract"
  | "submit-contract"
  | "archive-contract"
  | "create-stage"
  | "amend-stage"
  | "submit-evidence"
  | "submit-completion"
  | "approve"
  | "reject"
  | "request-more"
  | "release"
  | "fund-project"
  | "allocate-funds"
  | "adjust-buffer"
  | "dispute"
  | "variation"
  | "override";

export type NotificationStatus = "unread" | "read" | "dismissed" | "resolved";

export type AppUser = {
  id: string;
  name: string;
  role: UserRole;
  projectIds: string[];
  active: boolean;
};

export type StageApprovals = {
  professional: ApprovalDecision;
  commercial: ApprovalDecision;
  treasury: ApprovalDecision;
};

export type StageEvidenceStatus = "accepted" | "reviewed" | "pending" | "missing" | "rejected";

export type StageEvidenceItem = {
  id: string;
  name: string;
  status: StageEvidenceStatus;
  submissionState: "not-submitted" | "submitted" | "accepted" | "rejected" | "request-more";
  type: string;
  required: boolean;
  uploadedBy: string;
  uploadedAt?: string;
  uploadPlaceholder?: string;
  submissionNote?: string;
  reviewerNote?: string;
};

export type StageDispute = {
  id: string;
  title: string;
  status: "open" | "resolved";
  frozenAmount: number;
};

export type StageVariation = {
  id: string;
  title: string;
  status: "pending" | "approved";
  fundingRequired: number;
};

export type AdministrationLifecycleState = "draft" | "active" | "amended" | "rejected" | "archived";
export type StageFundingStatus = "unfunded" | "reserved" | "funded";
export type StageDisputeState = "none" | "open" | "resolved";
export type StageVariationState = "none" | "pending" | "approved";

export type ContractPartyRole = "employer" | "delivery-partner" | "funder" | "administrator";

export type ContractParty = {
  role: ContractPartyRole;
  name: string;
  organisation: string;
};

export type FundingStructure = {
  model: "escrow" | "direct" | "milestone";
  reserveHeld: number;
  releaseRule: string;
};

export type ProjectHealthState = "healthy" | "at-risk" | "blocked";
export type ProjectTrustState = "trusted" | "watch" | "critical";

export type ProjectRecord = {
  id: string;
  name: string;
  code: string;
  sector: string;
  region: string;
  clientName: string;
  health: ProjectHealthState;
  trustState: ProjectTrustState;
  active: boolean;
};

export type ProjectFundingRecord = {
  projectId: string;
  ringfencedFunds: number;
  bufferAmount: number;
  warningThresholdPercent: number;
  stageAllocations: Record<string, number>;
  lastUpdatedAt: string;
};

export type SignOffModel = {
  mode: "sequential" | "parallel";
  requiredRoles: ApprovalRole[];
};

export type AmendmentRecord = {
  id: string;
  timestamp: string;
  summary: string;
  fromLifecycle: AdministrationLifecycleState;
  toLifecycle: AdministrationLifecycleState;
};

export type ContractRecord = {
  id: string;
  projectId: string;
  projectIdentity: string;
  title: string;
  summary: string;
  parties: ContractParty[];
  totalValue: number;
  allocatedFunding: number;
  fundingStructure: FundingStructure;
  signOffModel: SignOffModel;
  lifecycle: AdministrationLifecycleState;
  version: number;
  stageIds: string[];
  amendmentHistory: AmendmentRecord[];
};

export type StageRecord = {
  id: string;
  contractId: string;
  name: string;
  lifecycle: AdministrationLifecycleState;
  plannedStart: string;
  plannedEnd: string;
  value: number;
  progressPercent: number;
  requiredEvidence: string[];
  requiredApprovers: ApprovalRole[];
  status: StatusKey;
  blockers: string[];
  evidenceStatus: StageEvidenceStatus;
  approvals: StageApprovals;
  fundingGate: boolean;
  fundingStatus: StageFundingStatus;
  disputeState: StageDisputeState;
  variationState: StageVariationState;
  completionState: "not-started" | "submitted" | "returned" | "accepted";
  evidenceItems: StageEvidenceItem[];
  disputes: StageDispute[];
  variations: StageVariation[];
  amendmentHistory: AmendmentRecord[];
};

type StageStoreSnapshot = {
  projects: ProjectRecord[];
  contracts: ContractRecord[];
  stages: StageRecord[];
  projectFunding: ProjectFundingRecord[];
  users: AppUser[];
  notifications: NotificationRecord[];
  auditLog: AuditLogEntry[];
  eventHistory: ActivityEventRecord[];
};

export type QueueActionDefinition = {
  key: QueueActionKey;
  type: ActionType;
  requiresStage: boolean;
};

export type QueueActionExecutionResult = {
  success: boolean;
  message: string;
  postActionState: PostActionStateSummary | null;
};

export type NextStageActionSummary = {
  actionKey: QueueActionKey;
  label: string;
  priority: "critical" | "high" | "medium";
  requiredRole?: ApprovalRole;
};

export type PostActionStateSummary = {
  affectedStageIds: string[];
  primaryStageId: string | null;
  stageName: string | null;
  status: StatusKey | null;
  blockers: string[];
  nextActions: NextStageActionSummary[];
};

export type StageAuditStateSnapshot = {
  status: StatusKey;
  blockers: string[];
  evidenceStatus: StageEvidenceStatus;
  approvals: StageApprovals;
  fundingGate: boolean;
  completionState: StageRecord["completionState"];
  openDisputes: number;
  pendingVariations: number;
};

export type AuditLogEntry = {
  id: string;
  actionKey: QueueActionKey | string;
  stageId: string | null;
  contractId?: string | null;
  entityType?: "stage" | "contract" | "system";
  timestamp: string;
  previousState: StageAuditStateSnapshot | null;
  newState: StageAuditStateSnapshot | null;
  success: boolean;
  message: string;
};

export type ActivityEventRecord = {
  id: string;
  timestamp: string;
  stageId: string | null;
  eventType: "approval" | "evidence" | "funding" | "dispute" | "variation" | "release";
  actor?: UserRole;
  summary: string;
  details?: Record<string, string | number | boolean | null>;
};

export type NotificationRecord = {
  id: string;
  actionId: string;
  actionKey: QueueActionKey | string;
  title: string;
  detail: string;
  priority: PriorityKey;
  assignedRole: UserRole;
  assignedUserId: string | null;
  projectId: string;
  contractId: string | null;
  stageId: string | null;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
  active: boolean;
};

export type NotificationActionSource = {
  id: string;
  actionId: string;
  actionKey: QueueActionKey | string;
  title: string;
  detail: string;
  priority: PriorityKey;
  assignedRole: UserRole;
  assignedUserId: string | null;
  projectId: string;
  contractId: string | null;
  stageId: string | null;
};

export type MobileEvidenceSubmissionInput = {
  evidenceName: string;
  evidenceType: string;
  uploadPlaceholder: string;
  note?: string;
  submittedBy: string;
};

export type MobileApprovalAction = "approve" | "reject" | "request-more";

const initialContracts: ContractRecord[] = [
  {
    id: "c1",
    projectId: "proj-001",
    projectIdentity: "Central Plaza Tower / Groundworks",
    title: "Groundworks Package",
    summary: "Groundworks and enabling package for the podium and basement.",
    parties: [
      { role: "employer", name: "Eleanor Grant", organisation: "Central Plaza Developments" },
      { role: "delivery-partner", name: "Clara Jones", organisation: "BuildCo" },
      { role: "funder", name: "Eve Patel", organisation: "FundBank" },
      { role: "administrator", name: "Ben Smith", organisation: "AssurePro" },
    ],
    totalValue: 400000,
    allocatedFunding: 350000,
    fundingStructure: {
      model: "escrow",
      reserveHeld: 120000,
      releaseRule: "Sequential release on accepted evidence and treasury sign-off",
    },
    signOffModel: {
      mode: "sequential",
      requiredRoles: ["professional", "commercial", "treasury"],
    },
    lifecycle: "active",
    version: 2,
    stageIds: ["s1", "s2"],
    amendmentHistory: [],
  },
  {
    id: "c2",
    projectId: "proj-001",
    projectIdentity: "Central Plaza Tower / Superstructure",
    title: "Superstructure Package",
    summary: "Steel frame and elevated works for the main tower.",
    parties: [
      { role: "employer", name: "Eleanor Grant", organisation: "Central Plaza Developments" },
      { role: "delivery-partner", name: "Alice Carter", organisation: "BuildCo" },
      { role: "funder", name: "Eve Patel", organisation: "FundBank" },
      { role: "administrator", name: "Ben Smith", organisation: "AssurePro" },
    ],
    totalValue: 600000,
    allocatedFunding: 450000,
    fundingStructure: {
      model: "milestone",
      reserveHeld: 180000,
      releaseRule: "Milestone releases with professional, commercial, and treasury confirmation",
    },
    signOffModel: {
      mode: "sequential",
      requiredRoles: ["professional", "commercial", "treasury"],
    },
    lifecycle: "draft",
    version: 1,
    stageIds: ["s3"],
    amendmentHistory: [],
  },
  {
    id: "c3",
    projectId: "proj-002",
    projectIdentity: "Riverside Exchange / Enabling",
    title: "Enabling Works Package",
    summary: "Early enabling works, site logistics, and basement retention.",
    parties: [
      { role: "employer", name: "Naomi Price", organisation: "Riverside Developments" },
      { role: "delivery-partner", name: "Tom Alvarez", organisation: "RiverBuild" },
      { role: "funder", name: "Gareth Holt", organisation: "NorthBank Capital" },
      { role: "administrator", name: "Olivia Chen", organisation: "FieldAssure" },
    ],
    totalValue: 520000,
    allocatedFunding: 410000,
    fundingStructure: {
      model: "escrow",
      reserveHeld: 90000,
      releaseRule: "Sequential sign-off with escrow-backed releases",
    },
    signOffModel: {
      mode: "sequential",
      requiredRoles: ["professional", "commercial", "treasury"],
    },
    lifecycle: "active",
    version: 3,
    stageIds: ["s4", "s5"],
    amendmentHistory: [],
  },
  {
    id: "c4",
    projectId: "proj-002",
    projectIdentity: "Riverside Exchange / Facade",
    title: "Facade Package",
    summary: "Curtain walling, cladding, and envelope completion works.",
    parties: [
      { role: "employer", name: "Naomi Price", organisation: "Riverside Developments" },
      { role: "delivery-partner", name: "Tom Alvarez", organisation: "RiverBuild" },
      { role: "funder", name: "Gareth Holt", organisation: "NorthBank Capital" },
      { role: "administrator", name: "Olivia Chen", organisation: "FieldAssure" },
    ],
    totalValue: 680000,
    allocatedFunding: 520000,
    fundingStructure: {
      model: "milestone",
      reserveHeld: 140000,
      releaseRule: "Envelope releases gated by evidence and treasury review",
    },
    signOffModel: {
      mode: "parallel",
      requiredRoles: ["professional", "commercial", "treasury"],
    },
    lifecycle: "active",
    version: 1,
    stageIds: ["s6"],
    amendmentHistory: [],
  },
];

const initialProjects: ProjectRecord[] = [
  {
    id: "proj-001",
    name: "Central Plaza Tower",
    code: "CPT-01",
    sector: "Commercial",
    region: "London",
    clientName: "Central Plaza Developments",
    health: "at-risk",
    trustState: "watch",
    active: true,
  },
  {
    id: "proj-002",
    name: "Riverside Exchange",
    code: "RIV-02",
    sector: "Mixed Use",
    region: "Manchester",
    clientName: "Riverside Developments",
    health: "healthy",
    trustState: "trusted",
    active: true,
  },
];

const initialUsers: AppUser[] = [
  { id: "user-delivery-1", name: "Alice Carter", role: "delivery", projectIds: ["proj-001"], active: true },
  { id: "user-professional-1", name: "Ben Smith", role: "professional", projectIds: ["proj-001"], active: true },
  { id: "user-commercial-1", name: "Clara Jones", role: "commercial", projectIds: ["proj-001"], active: true },
  { id: "user-treasury-1", name: "David Lee", role: "treasury", projectIds: ["proj-001", "proj-002"], active: true },
  { id: "user-funder-1", name: "Eve Patel", role: "funder", projectIds: ["proj-001"], active: true },
  { id: "user-admin-1", name: "Iris Morgan", role: "admin", projectIds: ["proj-001", "proj-002"], active: true },
  { id: "user-delivery-2", name: "Tom Alvarez", role: "delivery", projectIds: ["proj-002"], active: true },
  { id: "user-professional-2", name: "Olivia Chen", role: "professional", projectIds: ["proj-002"], active: true },
  { id: "user-commercial-2", name: "Maya Singh", role: "commercial", projectIds: ["proj-002"], active: true },
  { id: "user-funder-2", name: "Gareth Holt", role: "funder", projectIds: ["proj-002"], active: true },
];

const initialProjectFunding: ProjectFundingRecord[] = [
  {
    projectId: "proj-001",
    ringfencedFunds: 100000,
    bufferAmount: 50000,
    warningThresholdPercent: 15,
    stageAllocations: {
      s1: 0,
      s2: 60000,
      s3: 0,
    },
    lastUpdatedAt: new Date().toISOString(),
  },
  {
    projectId: "proj-002",
    ringfencedFunds: 720000,
    bufferAmount: 85000,
    warningThresholdPercent: 10,
    stageAllocations: {
      s4: 120000,
      s5: 160000,
      s6: 310000,
    },
    lastUpdatedAt: new Date().toISOString(),
  },
];

const initialStages: StageRecord[] = [
  {
    id: "s1",
    contractId: "c1",
    name: "Site Setup",
    lifecycle: "active",
    plannedStart: "2026-04-01",
    plannedEnd: "2026-04-10",
    value: 100000,
    progressPercent: 100,
    requiredEvidence: ["Site setup photos", "Completion certificate"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "approved",
    blockers: [],
    evidenceStatus: "accepted",
    approvals: {
      professional: "approved",
      commercial: "approved",
      treasury: "approved",
    },
    fundingGate: true,
    fundingStatus: "funded",
    disputeState: "none",
    variationState: "none",
    evidenceItems: [
      {
        id: "e1",
        name: "Site Setup Photos",
        type: "photo",
        uploadedBy: "Site Engineer",
        uploadedAt: "2026-03-27 09:00",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
      {
        id: "e2",
        name: "Setup Completion Certificate",
        type: "certificate",
        uploadedBy: "Project Manager",
        uploadedAt: "2026-03-27 10:00",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
    ],
    completionState: "accepted",
    disputes: [],
    variations: [],
    amendmentHistory: [],
  },
  {
    id: "s2",
    contractId: "c1",
    name: "Excavation",
    lifecycle: "active",
    plannedStart: "2026-04-11",
    plannedEnd: "2026-04-25",
    value: 150000,
    progressPercent: 55,
    requiredEvidence: ["Inspection report", "Method statement", "Daily site record"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "blocked",
    blockers: [],
    evidenceStatus: "reviewed",
    approvals: {
      professional: "pending",
      commercial: "approved",
      treasury: "pending",
    },
    fundingGate: false,
    fundingStatus: "reserved",
    disputeState: "open",
    variationState: "pending",
    evidenceItems: [
      {
        id: "e3",
        name: "Excavation Inspection Report",
        type: "inspection",
        uploadedBy: "Inspector",
        uploadedAt: "2026-03-28 08:30",
        submissionState: "submitted",
        status: "reviewed",
        required: true,
      },
      {
        id: "e4",
        name: "Delivery Note - Excavator",
        type: "delivery_note",
        uploadedBy: "Supplier",
        uploadedAt: "2026-03-28 08:00",
        submissionState: "accepted",
        status: "accepted",
        required: false,
      },
    ],
    completionState: "not-started",
    disputes: [
      {
        id: "d1",
        title: "Excavation Over-measurement",
        status: "open",
        frozenAmount: 40000,
      },
    ],
    variations: [
      {
        id: "v1",
        title: "Additional Drainage Works",
        status: "pending",
        fundingRequired: 25000,
      },
    ],
    amendmentHistory: [],
  },
  {
    id: "s3",
    contractId: "c2",
    name: "Frame Install",
    lifecycle: "draft",
    plannedStart: "2026-05-01",
    plannedEnd: "2026-05-30",
    value: 300000,
    progressPercent: 10,
    requiredEvidence: ["Steel frame invoice", "Inspection certificate", "Delivery tickets"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "pending",
    blockers: [],
    evidenceStatus: "missing",
    approvals: {
      professional: "pending",
      commercial: "pending",
      treasury: "pending",
    },
    fundingGate: false,
    fundingStatus: "unfunded",
    disputeState: "none",
    variationState: "approved",
    evidenceItems: [
      {
        id: "e5",
        name: "Steel Frame Invoice",
        type: "invoice",
        uploadedBy: "Accounts",
        uploadedAt: "2026-03-29 09:15",
        submissionState: "not-submitted",
        status: "missing",
        required: true,
      },
      {
        id: "e6",
        name: "Frame Inspection Certificate",
        type: "certificate",
        uploadedBy: "Inspector",
        uploadedAt: "2026-03-29 10:00",
        submissionState: "rejected",
        status: "rejected",
        required: true,
      },
    ],
    completionState: "returned",
    disputes: [],
    variations: [
      {
        id: "v2",
        title: "Steel Frame Upgrade",
        status: "approved",
        fundingRequired: 50000,
      },
    ],
    amendmentHistory: [],
  },
  {
    id: "s4",
    contractId: "c3",
    name: "Site Logistics Setup",
    lifecycle: "active",
    plannedStart: "2026-04-05",
    plannedEnd: "2026-04-18",
    value: 120000,
    progressPercent: 100,
    requiredEvidence: ["Logistics setup photos", "Temporary works certificate"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "approved",
    blockers: [],
    evidenceStatus: "accepted",
    approvals: {
      professional: "approved",
      commercial: "approved",
      treasury: "approved",
    },
    fundingGate: true,
    fundingStatus: "funded",
    disputeState: "none",
    variationState: "none",
    evidenceItems: [
      {
        id: "e7",
        name: "Logistics setup photos",
        type: "photo",
        uploadedBy: "Site Engineer",
        uploadedAt: "2026-03-30 08:30",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
      {
        id: "e8",
        name: "Temporary works certificate",
        type: "certificate",
        uploadedBy: "Temporary Works Coordinator",
        uploadedAt: "2026-03-30 09:00",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
    ],
    completionState: "accepted",
    disputes: [],
    variations: [],
    amendmentHistory: [],
  },
  {
    id: "s5",
    contractId: "c3",
    name: "Retention Wall Works",
    lifecycle: "active",
    plannedStart: "2026-04-19",
    plannedEnd: "2026-05-08",
    value: 240000,
    progressPercent: 35,
    requiredEvidence: ["Concrete cube results", "Rebar inspection", "Survey record"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "reviewed",
    blockers: [],
    evidenceStatus: "accepted",
    approvals: {
      professional: "approved",
      commercial: "pending",
      treasury: "pending",
    },
    fundingGate: true,
    fundingStatus: "reserved",
    disputeState: "none",
    variationState: "none",
    evidenceItems: [
      {
        id: "e9",
        name: "Concrete cube results",
        type: "test",
        uploadedBy: "QA Lead",
        uploadedAt: "2026-03-30 11:00",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
      {
        id: "e10",
        name: "Rebar inspection",
        type: "inspection",
        uploadedBy: "Inspector",
        uploadedAt: "2026-03-30 12:00",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
    ],
    completionState: "submitted",
    disputes: [],
    variations: [],
    amendmentHistory: [],
  },
  {
    id: "s6",
    contractId: "c4",
    name: "Curtain Wall Install",
    lifecycle: "active",
    plannedStart: "2026-05-10",
    plannedEnd: "2026-06-15",
    value: 360000,
    progressPercent: 20,
    requiredEvidence: ["Facade delivery tickets", "Install QA checklist", "Wind load certification"],
    requiredApprovers: ["professional", "commercial", "treasury"],
    status: "at-risk",
    blockers: [],
    evidenceStatus: "reviewed",
    approvals: {
      professional: "approved",
      commercial: "approved",
      treasury: "pending",
    },
    fundingGate: false,
    fundingStatus: "reserved",
    disputeState: "none",
    variationState: "none",
    evidenceItems: [
      {
        id: "e11",
        name: "Facade delivery tickets",
        type: "delivery_note",
        uploadedBy: "Logistics Manager",
        uploadedAt: "2026-03-31 08:00",
        submissionState: "submitted",
        status: "reviewed",
        required: true,
      },
      {
        id: "e12",
        name: "Install QA checklist",
        type: "checklist",
        uploadedBy: "QA Lead",
        uploadedAt: "2026-03-31 08:30",
        submissionState: "accepted",
        status: "accepted",
        required: true,
      },
    ],
    completionState: "not-started",
    disputes: [],
    variations: [],
    amendmentHistory: [],
  },
];

let snapshot: StageStoreSnapshot = {
  projects: initialProjects,
  contracts: initialContracts,
  stages: initialStages,
  projectFunding: initialProjectFunding,
  users: initialUsers,
  notifications: [],
  auditLog: [],
  eventHistory: [],
};

initialProjectFunding.forEach((funding) => {
  syncFundingForProject(funding.projectId);
});

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function getProjects() {
  return snapshot.projects;
}

export function getProjectById(id: string) {
  return snapshot.projects.find((project) => project.id === id) ?? null;
}

export function getStages() {
  return snapshot.stages;
}

export function getContracts() {
  return snapshot.contracts;
}

export function getProjectFunding() {
  return snapshot.projectFunding;
}

export function getProjectFundingById(projectId: string) {
  return snapshot.projectFunding.find((item) => item.projectId === projectId) ?? null;
}

export function getUsers() {
  return snapshot.users;
}

export function getNotifications() {
  return snapshot.notifications;
}

export function getAuditLog() {
  return snapshot.auditLog;
}

export function getContractById(id: string) {
  return snapshot.contracts.find((contract) => contract.id === id) ?? null;
}

export function getUserById(id: string) {
  return snapshot.users.find((user) => user.id === id) ?? null;
}

export function getStageById(id: string) {
  return snapshot.stages.find((stage) => stage.id === id) ?? null;
}

function snapshotStageState(stage: StageRecord | null): StageAuditStateSnapshot | null {
  if (!stage) {
    return null;
  }

  return {
    status: stage.status,
    blockers: [...stage.blockers],
    evidenceStatus: stage.evidenceStatus,
    approvals: {
      ...stage.approvals,
    },
    fundingGate: stage.fundingGate,
    completionState: stage.completionState,
    openDisputes: stage.disputes.filter((dispute) => dispute.status === "open").length,
    pendingVariations: stage.variations.filter((variation) => variation.status === "pending").length,
  };
}

function approvalRoleMatchesUserRole(role: ApprovalRole, userRole: UserRole) {
  return role === userRole;
}

export function hasPermission(userRole: UserRole, action: PermissionAction, context?: { requiredApprovalRole?: ApprovalRole }) {
  if (userRole === "admin") {
    return true;
  }

  switch (action) {
    case "create-contract":
    case "amend-contract":
    case "submit-contract":
    case "archive-contract":
    case "create-stage":
    case "amend-stage":
    case "override":
      return false;
    case "submit-evidence":
    case "submit-completion":
      return userRole === "delivery";
    case "approve":
    case "reject":
    case "request-more":
      return context?.requiredApprovalRole ? approvalRoleMatchesUserRole(context.requiredApprovalRole, userRole) : false;
    case "release":
      return userRole === "treasury" || userRole === "funder";
    case "fund-project":
      return userRole === "funder" || userRole === "treasury";
    case "allocate-funds":
    case "adjust-buffer":
      return userRole === "treasury" || userRole === "funder";
    case "dispute":
    case "variation":
      return userRole === "commercial";
    default:
      return false;
  }
}

function permissionDeniedResult(message: string) {
  return {
    success: false,
    message,
    postActionState: null,
  };
}

function clampProgress(progressPercent: number) {
  return Math.min(100, Math.max(0, Math.round(progressPercent)));
}

export function getStageRemainingFundingRequirement(stage: StageRecord) {
  const progressShare = clampProgress(stage.progressPercent) / 100;
  return Math.max(stage.value * (1 - progressShare), 0);
}

export function deriveStageEvidenceStatus(evidenceItems: StageEvidenceItem[]): StageEvidenceStatus {
  const requiredItems = evidenceItems.filter((item) => item.required);

  if (requiredItems.some((item) => item.status === "rejected")) {
    return "rejected";
  }

  if (requiredItems.some((item) => item.status === "missing")) {
    return "missing";
  }

  if (requiredItems.length > 0 && requiredItems.every((item) => item.status === "accepted")) {
    return "accepted";
  }

  if (requiredItems.some((item) => item.status === "reviewed")) {
    return "reviewed";
  }

  return "pending";
}

export function canActOnApproval(stage: StageRecord, role: ApprovalRole) {
  if (role === "professional") {
    return true;
  }

  if (role === "commercial") {
    return stage.approvals.professional === "approved";
  }

  return stage.approvals.professional === "approved" && stage.approvals.commercial === "approved";
}

export function isStageFundingEligible(stage: StageRecord) {
  return (
    stage.approvals.professional === "approved" &&
    stage.approvals.commercial === "approved" &&
    stage.approvals.treasury === "approved" &&
    stage.evidenceStatus === "accepted"
  );
}

export function deriveStageStatus(stage: StageRecord): StatusKey {
  const hasOpenDisputes = stage.disputes.some((dispute) => dispute.status === "open");
  const hasPendingVariations = stage.variations.some((variation) => variation.status === "pending");

  if (
    stage.approvals.professional === "rejected" ||
    stage.approvals.commercial === "rejected" ||
    stage.approvals.treasury === "rejected"
  ) {
    return "rejected";
  }

  if (stage.blockers.includes("Additional information requested before approval")) {
    return "at-risk";
  }

  if (stage.blockers.includes("Stage placed on hold pending review")) {
    return "blocked";
  }

  if (hasOpenDisputes || hasPendingVariations) {
    return "at-risk";
  }

  if (isStageFundingEligible(stage) && stage.fundingGate) {
    return "approved";
  }

  if (stage.evidenceStatus === "missing" || stage.evidenceStatus === "rejected" || !stage.fundingGate) {
    return "blocked";
  }

  if (
    stage.approvals.professional === "approved" ||
    stage.approvals.commercial === "approved" ||
    stage.approvals.treasury === "approved" ||
    stage.evidenceStatus === "reviewed" ||
    stage.evidenceStatus === "pending"
  ) {
    return "reviewed";
  }

  return "pending";
}

export function getStageComputedBlockers(stage: StageRecord) {
  const reasons = new Set(
    stage.blockers.filter(
      (blocker) =>
        blocker !== "Required evidence not fully accepted" &&
        blocker !== "Evidence review requested" &&
        blocker !== "Professional approval pending" &&
        blocker !== "Professional approval rejected" &&
        blocker !== "Commercial approval pending" &&
        blocker !== "Commercial approval rejected" &&
        blocker !== "Treasury approval pending" &&
        blocker !== "Treasury approval rejected" &&
        blocker !== "Funding eligibility pending approvals" &&
        blocker !== "Open dispute requires commercial review" &&
        blocker !== "Pending variation requires commercial review",
    ),
  );

  if (stage.approvals.professional === "pending") {
    reasons.add("Professional approval pending");
  }

  if (stage.approvals.professional === "rejected") {
    reasons.add("Professional approval rejected");
  }

  if (stage.approvals.commercial === "pending") {
    reasons.add("Commercial approval pending");
  }

  if (stage.approvals.commercial === "rejected") {
    reasons.add("Commercial approval rejected");
  }

  if (stage.approvals.treasury === "pending") {
    reasons.add("Treasury approval pending");
  }

  if (stage.approvals.treasury === "rejected") {
    reasons.add("Treasury approval rejected");
  }

  if (!isStageFundingEligible(stage)) {
    reasons.add("Funding eligibility pending approvals");
  }

  if (!stage.fundingGate) {
    reasons.add("Funding gate blocked");
  }

  if (stage.evidenceStatus !== "accepted") {
    reasons.add(stage.evidenceStatus === "pending" ? "Evidence review requested" : "Required evidence not fully accepted");
  }

  if (stage.disputes.some((dispute) => dispute.status === "open")) {
    reasons.add("Open dispute requires commercial review");
  }

  if (stage.variations.some((variation) => variation.status === "pending")) {
    reasons.add("Pending variation requires commercial review");
  }

  return Array.from(reasons);
}

export function getStagePaymentDecision(stage: StageRecord) {
  const reasons = getStageComputedBlockers(stage);

  return {
    releasable: isStageFundingEligible(stage) && stage.fundingGate && reasons.length === 0,
    reasons,
  };
}

export function getStageNextActions(stage: StageRecord): NextStageActionSummary[] {
  const nextActions: NextStageActionSummary[] = [];

  if (!stage.fundingGate) {
    nextActions.push({
      actionKey: "release-funding",
      label: "Funding gate blocked",
      priority: "critical",
    });
  }

  if (stage.disputes.some((dispute) => dispute.status === "open")) {
    nextActions.push({
      actionKey: "review-dispute",
      label: stage.disputes.find((dispute) => dispute.status === "open")?.title ?? "Open dispute requires commercial review",
      priority: "high",
    });
  }

  if (stage.variations.some((variation) => variation.status === "pending")) {
    nextActions.push({
      actionKey: "review-variation",
      label: stage.variations.find((variation) => variation.status === "pending")?.title ?? "Pending variation requires commercial review",
      priority: "medium",
      requiredRole: "commercial",
    });
  }

  if (stage.evidenceStatus !== "accepted") {
    nextActions.push({
      actionKey: "review-evidence",
      label: stage.evidenceStatus === "pending" ? "Evidence review requested" : "Required evidence not fully accepted",
      priority: "high",
    });
  }

  if (stage.approvals.professional !== "approved") {
    nextActions.push({
      actionKey: "approve-professional",
      label: stage.approvals.professional === "rejected" ? "Professional approval rejected" : "Professional approval pending",
      priority: stage.approvals.professional === "rejected" ? "high" : "medium",
      requiredRole: "professional",
    });
  }

  if (stage.approvals.professional === "approved" && stage.approvals.commercial !== "approved") {
    nextActions.push({
      actionKey: "approve-commercial",
      label: stage.approvals.commercial === "rejected" ? "Commercial approval rejected" : "Commercial approval pending",
      priority: stage.approvals.commercial === "rejected" ? "high" : "medium",
      requiredRole: "commercial",
    });
  }

  if (
    stage.approvals.professional === "approved" &&
    stage.approvals.commercial === "approved" &&
    stage.approvals.treasury !== "approved"
  ) {
    nextActions.push({
      actionKey: "approve-treasury",
      label: stage.approvals.treasury === "rejected" ? "Treasury approval rejected" : "Treasury approval pending",
      priority: stage.approvals.treasury === "rejected" ? "high" : "medium",
      requiredRole: "treasury",
    });
  }

  return nextActions;
}

function buildPostActionStateSummary(stageIds: string[]): PostActionStateSummary | null {
  const affectedStageIds = Array.from(new Set(stageIds));
  const primaryStage = affectedStageIds
    .map((stageId) => getStageById(stageId))
    .find((stage): stage is StageRecord => stage !== null);

  if (!primaryStage) {
    return affectedStageIds.length > 0
      ? {
          affectedStageIds,
          primaryStageId: null,
          stageName: null,
          status: null,
          blockers: [],
          nextActions: [],
        }
      : null;
  }

  return {
    affectedStageIds,
    primaryStageId: primaryStage.id,
    stageName: primaryStage.name,
    status: primaryStage.status,
    blockers: primaryStage.blockers,
    nextActions: getStageNextActions(primaryStage),
  };
}

function createAuditId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function appendAdministrativeAuditEntry(entry: {
  actionKey: string;
  message: string;
  stageId?: string | null;
  contractId?: string | null;
  previousState?: StageAuditStateSnapshot | null;
  newState?: StageAuditStateSnapshot | null;
  entityType: "stage" | "contract" | "system";
}) {
  const timestamp = new Date().toISOString();

  appendAuditEntries([
    {
      id: createAuditId("audit"),
      actionKey: entry.actionKey,
      stageId: entry.stageId ?? null,
      contractId: entry.contractId ?? null,
      entityType: entry.entityType,
      timestamp,
      previousState: entry.previousState ?? null,
      newState: entry.newState ?? null,
      success: true,
      message: entry.message,
    },
  ]);
}

export function reconcileNotifications(sources: NotificationActionSource[]) {
  const timestamp = new Date().toISOString();
  const sourceIds = new Set(sources.map((source) => source.id));
  const nextNotifications = [...snapshot.notifications];
  let changed = false;

  sources.forEach((source) => {
    const existingIndex = nextNotifications.findIndex((notification) => notification.id === source.id);

    if (existingIndex >= 0) {
      const existing = nextNotifications[existingIndex];
      const shouldReactivate = !existing.active;
      const sourceChanged =
        existing.actionId !== source.actionId ||
        existing.actionKey !== source.actionKey ||
        existing.title !== source.title ||
        existing.detail !== source.detail ||
        existing.priority !== source.priority ||
        existing.assignedRole !== source.assignedRole ||
        existing.assignedUserId !== source.assignedUserId ||
        existing.projectId !== source.projectId ||
        existing.contractId !== source.contractId ||
        existing.stageId !== source.stageId;

      if (!sourceChanged && !shouldReactivate) {
        return;
      }

      changed = true;
      nextNotifications[existingIndex] = {
        ...existing,
        ...source,
        status: shouldReactivate || existing.status === "resolved" ? "unread" : existing.status,
        updatedAt: timestamp,
        active: true,
      };
      return;
    }

    changed = true;
    nextNotifications.unshift({
      ...source,
      status: "unread",
      createdAt: timestamp,
      updatedAt: timestamp,
      active: true,
    });
  });

  nextNotifications.forEach((notification, index) => {
    if (!sourceIds.has(notification.id) && notification.active) {
      changed = true;
      nextNotifications[index] = {
        ...notification,
        status: notification.status === "dismissed" ? "dismissed" : "resolved",
        updatedAt: timestamp,
        active: false,
      };
    }
  });

  if (!changed) {
    return;
  }

  snapshot = {
    ...snapshot,
    notifications: nextNotifications,
  };

  emitChange();
}

export function updateNotificationStatus(notificationId: string, status: NotificationStatus) {
  snapshot = {
    ...snapshot,
    notifications: snapshot.notifications.map((notification) =>
      notification.id === notificationId
        ? {
            ...notification,
            status,
            active: status === "dismissed" ? false : notification.active,
            updatedAt: new Date().toISOString(),
          }
        : notification,
    ),
  };

  emitChange();
}

function syncStageRelationshipState(stage: StageRecord): StageRecord {
  let disputes = stage.disputes;
  let variations = stage.variations;

  if (stage.disputeState === "none") {
    disputes = [];
  } else if (stage.disputeState === "open" && !disputes.some((dispute) => dispute.status === "open")) {
    disputes = [
      ...disputes,
      {
        id: createAuditId("dispute"),
        title: `${stage.name} administration dispute`,
        status: "open",
        frozenAmount: Math.round(stage.value * 0.15),
      },
    ];
  } else if (stage.disputeState === "resolved") {
    disputes = disputes.map((dispute) => ({ ...dispute, status: "resolved" }));
  }

  if (stage.variationState === "none") {
    variations = [];
  } else if (stage.variationState === "pending" && !variations.some((variation) => variation.status === "pending")) {
    variations = [
      ...variations,
      {
        id: createAuditId("variation"),
        title: `${stage.name} administration variation`,
        status: "pending",
        fundingRequired: Math.round(stage.value * 0.1),
      },
    ];
  } else if (stage.variationState === "approved") {
    variations = variations.map((variation) => ({ ...variation, status: "approved" }));
  }

  return {
    ...stage,
    disputes,
    variations,
  };
}

function getProjectFundingAllocationAvailable(projectId: string, excludingStageId?: string) {
  const funding = getProjectFundingById(projectId);

  if (!funding) {
    return 0;
  }

  const allocated = Object.entries(funding.stageAllocations).reduce((total, [stageId, amount]) => {
    if (excludingStageId && stageId === excludingStageId) {
      return total;
    }

    return total + amount;
  }, 0);

  return Math.max(funding.ringfencedFunds - allocated, 0);
}

function syncFundingForProject(projectId: string) {
  const funding = getProjectFundingById(projectId);

  if (!funding) {
    return;
  }

  const totalAllocated = Object.values(funding.stageAllocations).reduce((total, amount) => total + amount, 0);
  const projectCanProceed = funding.ringfencedFunds >= totalAllocated + funding.bufferAmount;

  snapshot = {
    ...snapshot,
    stages: snapshot.stages.map((stage) => {
      const contract = getContractById(stage.contractId);

      if (!contract || contract.projectId !== projectId) {
        return stage;
      }

      const allocated = funding.stageAllocations[stage.id] ?? 0;
      const required = getStageRemainingFundingRequirement(stage);
      const canOpenGate = required === 0 ? stage.fundingGate : allocated >= required && projectCanProceed;
      const fundingStatus: StageFundingStatus =
        allocated >= required && required > 0
          ? "funded"
          : allocated > 0
          ? "reserved"
          : "unfunded";

      return normalizeStage({
        ...stage,
        fundingGate: canOpenGate,
        fundingStatus,
      });
    }),
  };
}

function appendAuditEntries(entries: AuditLogEntry[]) {
  if (entries.length === 0) {
    return;
  }

  snapshot = {
    ...snapshot,
    auditLog: [...entries, ...snapshot.auditLog],
  };

  emitChange();
}

function normalizeStage(stage: StageRecord): StageRecord {
  const stagedRelationships = syncStageRelationshipState(stage);
  const fundingStatus: StageFundingStatus = stagedRelationships.fundingGate
    ? "funded"
    : stagedRelationships.fundingStatus === "funded"
    ? "reserved"
    : stagedRelationships.fundingStatus;
  const disputeState: StageDisputeState = stagedRelationships.disputes.length === 0
    ? stagedRelationships.disputeState === "resolved"
      ? "resolved"
      : "none"
    : stagedRelationships.disputes.some((dispute) => dispute.status === "open")
    ? "open"
    : "resolved";
  const variationState: StageVariationState = stagedRelationships.variations.length === 0
    ? stagedRelationships.variationState === "approved"
      ? "approved"
      : "none"
    : stagedRelationships.variations.some((variation) => variation.status === "pending")
    ? "pending"
    : "approved";
  const normalized = {
    ...stagedRelationships,
    fundingStatus,
    disputeState,
    variationState,
    status: deriveStageStatus(stagedRelationships),
  };

  return {
    ...normalized,
    blockers: getStageComputedBlockers(normalized),
  };
}

export function updateStage(id: string, updates: Partial<StageRecord>) {
  let changed = false;
  const existingStage = getStageById(id);

  snapshot = {
    ...snapshot,
    stages: snapshot.stages.map((stage) => {
      if (stage.id !== id) {
        return stage;
      }

      changed = true;
      return normalizeStage({
        ...stage,
        ...updates,
      });
    }),
  };

  if (changed) {
    const projectId = existingStage ? getContractById(existingStage.contractId)?.projectId ?? null : null;

    if (projectId) {
      syncFundingForProject(projectId);
    }

    emitChange();
  }
}

export function addProjectFunds(projectId: string, amount: number, actorRole: UserRole = "funder") {
  if (!hasPermission(actorRole, "fund-project")) {
    return permissionDeniedResult("This user cannot add project funds.");
  }

  if (amount <= 0) {
    return permissionDeniedResult("Funding top-up amount must be greater than zero.");
  }

  const funding = getProjectFundingById(projectId);

  if (!funding) {
    return permissionDeniedResult("Funding control record could not be found.");
  }

  snapshot = {
    ...snapshot,
    projectFunding: snapshot.projectFunding.map((entry) =>
      entry.projectId === projectId
        ? {
            ...entry,
            ringfencedFunds: entry.ringfencedFunds + amount,
            lastUpdatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };

  syncFundingForProject(projectId);
  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "add-funds",
    contractId: null,
    entityType: "system",
    message: `Ringfenced funds increased by £${Math.round(amount).toLocaleString("en-GB")} for ${projectId}.`,
  });

  return {
    success: true,
    message: `Added £${Math.round(amount).toLocaleString("en-GB")} to ringfenced funds.`,
    postActionState: null,
  };
}

export function allocateFundsToStage(stageId: string, amount: number, actorRole: UserRole = "treasury") {
  if (!hasPermission(actorRole, "allocate-funds")) {
    return permissionDeniedResult("This user cannot allocate stage funding.");
  }

  const stage = getStageById(stageId);

  if (!stage) {
    return permissionDeniedResult("Stage could not be found.");
  }

  const contract = getContractById(stage.contractId);

  if (!contract) {
    return permissionDeniedResult("Contract could not be found for stage funding allocation.");
  }

  const funding = getProjectFundingById(contract.projectId);

  if (!funding) {
    return permissionDeniedResult("Funding control record could not be found.");
  }

  const allocationAmount = Math.max(0, Math.round(amount));

  if (allocationAmount <= 0) {
    return permissionDeniedResult("Allocation amount must be greater than zero.");
  }

  const currentlyAllocated = funding.stageAllocations[stageId] ?? 0;
  const availableToAllocate = getProjectFundingAllocationAvailable(contract.projectId, stageId) + currentlyAllocated;
  const nextAllocation = Math.min(allocationAmount, availableToAllocate);

  snapshot = {
    ...snapshot,
    projectFunding: snapshot.projectFunding.map((entry) =>
      entry.projectId === contract.projectId
        ? {
            ...entry,
            stageAllocations: {
              ...entry.stageAllocations,
              [stageId]: nextAllocation,
            },
            lastUpdatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };

  syncFundingForProject(contract.projectId);
  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "allocate-stage-funding",
    contractId: contract.id,
    stageId,
    entityType: "stage",
    previousState: snapshotStageState(stage),
    newState: snapshotStageState(getStageById(stageId)),
    message: `Funding allocation for ${stage.name} set to £${nextAllocation.toLocaleString("en-GB")}.`,
  });

  return {
    success: true,
    message: `Allocated £${nextAllocation.toLocaleString("en-GB")} to ${stage.name}.`,
    postActionState: buildPostActionStateSummary([stageId]),
  };
}

export function adjustProjectFundingBuffer(projectId: string, bufferAmount: number, actorRole: UserRole = "treasury") {
  if (!hasPermission(actorRole, "adjust-buffer")) {
    return permissionDeniedResult("This user cannot adjust the funding buffer.");
  }

  const funding = getProjectFundingById(projectId);

  if (!funding) {
    return permissionDeniedResult("Funding control record could not be found.");
  }

  snapshot = {
    ...snapshot,
    projectFunding: snapshot.projectFunding.map((entry) =>
      entry.projectId === projectId
        ? {
            ...entry,
            bufferAmount: Math.max(0, Math.round(bufferAmount)),
            lastUpdatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };

  syncFundingForProject(projectId);
  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "adjust-buffer",
    contractId: null,
    entityType: "system",
    message: `Funding buffer adjusted to £${Math.max(0, Math.round(bufferAmount)).toLocaleString("en-GB")} for ${projectId}.`,
  });

  return {
    success: true,
    message: `Funding buffer adjusted to £${Math.max(0, Math.round(bufferAmount)).toLocaleString("en-GB")}.`,
    postActionState: null,
  };
}

export function createContract(
  contract: Omit<ContractRecord, "id" | "version" | "stageIds" | "amendmentHistory">,
  actorRole: UserRole = "admin",
) {
  if (!hasPermission(actorRole, "create-contract")) {
    return null;
  }

  const id = createAuditId("contract");
  const nextContract: ContractRecord = {
    ...contract,
    id,
    version: 1,
    stageIds: [],
    amendmentHistory: [],
  };

  snapshot = {
    ...snapshot,
    contracts: [...snapshot.contracts, nextContract],
  };

  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "create-contract",
    contractId: id,
    entityType: "contract",
    message: `Contract ${nextContract.title} created.`,
  });

  return nextContract;
}

export function updateContract(id: string, updates: Partial<ContractRecord>, actorRole: UserRole = "admin") {
  if (!hasPermission(actorRole, "amend-contract")) {
    return null;
  }

  const previousContract = getContractById(id);

  if (!previousContract) {
    return null;
  }

  const nextContracts = snapshot.contracts.map((contract) =>
    contract.id === id ? { ...contract, ...updates } : contract,
  );

  snapshot = {
    ...snapshot,
    contracts: nextContracts,
  };

  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "update-contract",
    contractId: id,
    entityType: "contract",
    message: `Contract ${previousContract.title} updated.`,
  });

  return nextContracts.find((contract) => contract.id === id) ?? null;
}

export function amendContract(contractId: string, summary: string, actorRole: UserRole = "admin") {
  if (!hasPermission(actorRole, "amend-contract")) {
    return null;
  }

  const contract = getContractById(contractId);

  if (!contract) {
    return null;
  }

  const amendment: AmendmentRecord = {
    id: createAuditId("amendment"),
    timestamp: new Date().toISOString(),
    summary,
    fromLifecycle: contract.lifecycle,
    toLifecycle: "amended",
  };

  snapshot = {
    ...snapshot,
    contracts: snapshot.contracts.map((entry) =>
      entry.id === contractId
        ? {
            ...entry,
            lifecycle: "amended",
            version: entry.version + 1,
            amendmentHistory: [amendment, ...entry.amendmentHistory],
          }
        : entry,
    ),
    stages: snapshot.stages.map((stage) =>
      stage.contractId === contractId
        ? normalizeStage({
            ...stage,
            lifecycle: "amended",
            fundingGate: false,
            fundingStatus: stage.fundingGate ? "reserved" : stage.fundingStatus,
            blockers: [...stage.blockers, "Contract amendment awaiting resubmission"],
          })
        : stage,
    ),
  };

  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "amend-contract",
    contractId,
    entityType: "contract",
    message: `Contract ${contract.title} amended: ${summary}`,
  });

  return getContractById(contractId);
}

export function resubmitContract(contractId: string, actorRole: UserRole = "admin") {
  if (!hasPermission(actorRole, "submit-contract")) {
    return null;
  }

  const contract = getContractById(contractId);

  if (!contract) {
    return null;
  }

  snapshot = {
    ...snapshot,
    contracts: snapshot.contracts.map((entry) =>
      entry.id === contractId ? { ...entry, lifecycle: "active" } : entry,
    ),
    stages: snapshot.stages.map((stage) =>
      stage.contractId === contractId
        ? normalizeStage({
            ...stage,
            lifecycle: stage.lifecycle === "archived" ? "archived" : "active",
            fundingGate: stage.fundingStatus !== "unfunded",
            blockers: stage.blockers.filter((blocker) => blocker !== "Contract amendment awaiting resubmission"),
          })
        : stage,
    ),
  };

  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "resubmit-contract",
    contractId,
    entityType: "contract",
    message: `Contract ${contract.title} resubmitted for active release control.`,
  });

  return getContractById(contractId);
}

export function setContractLifecycle(
  contractId: string,
  lifecycle: AdministrationLifecycleState,
  actorRole: UserRole = "admin",
) {
  const permissionAction = lifecycle === "archived" ? "archive-contract" : "amend-contract";

  if (!hasPermission(actorRole, permissionAction)) {
    return null;
  }

  const contract = getContractById(contractId);

  if (!contract) {
    return null;
  }

  snapshot = {
    ...snapshot,
    contracts: snapshot.contracts.map((entry) =>
      entry.id === contractId ? { ...entry, lifecycle } : entry,
    ),
  };

  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "set-contract-lifecycle",
    contractId,
    entityType: "contract",
    message: `Contract ${contract.title} moved to ${lifecycle}.`,
  });

  return getContractById(contractId);
}

export function createStage(
  contractId: string,
  stage: Omit<
    StageRecord,
    "id" | "contractId" | "status" | "blockers" | "approvals" | "evidenceStatus" | "evidenceItems" | "disputes" | "variations" | "amendmentHistory" | "completionState" | "progressPercent"
  >,
  actorRole: UserRole = "admin",
) {
  if (!hasPermission(actorRole, "create-stage")) {
    return null;
  }

  const contract = getContractById(contractId);

  if (!contract) {
    return null;
  }

  const id = createAuditId("stage");
  const nextStage = normalizeStage({
    ...stage,
    id,
    contractId,
    status: "pending",
    blockers: [],
    progressPercent: 0,
    evidenceStatus: stage.requiredEvidence.length === 0 ? "accepted" : "missing",
    approvals: {
      professional: "pending",
      commercial: "pending",
      treasury: "pending",
    },
    evidenceItems: stage.requiredEvidence.map((itemName) => ({
      id: createAuditId("evidence"),
      name: itemName,
      status: "missing",
      submissionState: "not-submitted",
      type: "document",
      required: true,
      uploadedBy: "Administration",
    })),
    completionState: "not-started",
    disputes: [],
    variations: [],
    amendmentHistory: [],
  });

  snapshot = {
    ...snapshot,
    stages: [...snapshot.stages, nextStage],
    contracts: snapshot.contracts.map((entry) =>
      entry.id === contractId ? { ...entry, stageIds: [...entry.stageIds, id] } : entry,
    ),
  };

  syncFundingForProject(contract.projectId);
  emitChange();
  appendAdministrativeAuditEntry({
    actionKey: "create-stage",
    contractId,
    stageId: id,
    entityType: "stage",
    previousState: null,
    newState: snapshotStageState(nextStage),
    message: `Stage ${nextStage.name} created under ${contract.title}.`,
  });

  return nextStage;
}

export function updateStageAdministration(
  stageId: string,
  updates: Partial<StageRecord>,
  actorRole: UserRole = "admin",
) {
  if (!hasPermission(actorRole, "amend-stage")) {
    return null;
  }

  const previousStage = getStageById(stageId);

  if (!previousStage) {
    return null;
  }

  updateStage(stageId, updates);
  const nextStage = getStageById(stageId);

  appendAdministrativeAuditEntry({
    actionKey: "update-stage-admin",
    contractId: previousStage.contractId,
    stageId,
    entityType: "stage",
    previousState: snapshotStageState(previousStage),
    newState: snapshotStageState(nextStage),
    message: `Stage ${previousStage.name} administration updated.`,
  });

  return nextStage;
}

export function amendStage(stageId: string, summary: string, actorRole: UserRole = "admin") {
  if (!hasPermission(actorRole, "amend-stage")) {
    return null;
  }

  const previousStage = getStageById(stageId);

  if (!previousStage) {
    return null;
  }

  const amendment: AmendmentRecord = {
    id: createAuditId("amendment"),
    timestamp: new Date().toISOString(),
    summary,
    fromLifecycle: previousStage.lifecycle,
    toLifecycle: "amended",
  };

  updateStage(stageId, {
    lifecycle: "amended",
    fundingGate: false,
    fundingStatus: previousStage.fundingGate ? "reserved" : previousStage.fundingStatus,
    blockers: [...previousStage.blockers, "Stage amendment awaiting resubmission"],
    amendmentHistory: [amendment, ...previousStage.amendmentHistory],
  });

  const nextStage = getStageById(stageId);
  appendAdministrativeAuditEntry({
    actionKey: "amend-stage",
    contractId: previousStage.contractId,
    stageId,
    entityType: "stage",
    previousState: snapshotStageState(previousStage),
    newState: snapshotStageState(nextStage),
    message: `Stage ${previousStage.name} amended: ${summary}`,
  });

  return nextStage;
}

export function resubmitStage(stageId: string, actorRole: UserRole = "admin") {
  if (!hasPermission(actorRole, "amend-stage")) {
    return null;
  }

  const previousStage = getStageById(stageId);

  if (!previousStage) {
    return null;
  }

  updateStage(stageId, {
    lifecycle: "active",
    fundingGate: previousStage.fundingStatus !== "unfunded",
    blockers: previousStage.blockers.filter((blocker) => blocker !== "Stage amendment awaiting resubmission"),
  });

  const nextStage = getStageById(stageId);
  appendAdministrativeAuditEntry({
    actionKey: "resubmit-stage",
    contractId: previousStage.contractId,
    stageId,
    entityType: "stage",
    previousState: snapshotStageState(previousStage),
    newState: snapshotStageState(nextStage),
    message: `Stage ${previousStage.name} resubmitted for release control.`,
  });

  return nextStage;
}

export function updateStageEvidence(stageId: string, evidenceItems: StageEvidenceItem[]) {
  const evidenceStatus = deriveStageEvidenceStatus(evidenceItems);
  const stage = getStageById(stageId);
  const nextBlockers = stage
    ? getStageComputedBlockers({
        ...stage,
        evidenceItems,
        evidenceStatus,
      })
    : [];

  updateStage(stageId, {
    evidenceItems,
    evidenceStatus,
    blockers: nextBlockers.filter(
      (blocker) =>
        blocker !== "Professional approval pending" &&
        blocker !== "Commercial approval pending" &&
        blocker !== "Treasury approval pending" &&
        blocker !== "Professional approval rejected" &&
        blocker !== "Commercial approval rejected" &&
        blocker !== "Treasury approval rejected" &&
        blocker !== "Funding eligibility pending approvals" &&
        blocker !== "Funding gate blocked" &&
        blocker !== "Required evidence not fully accepted" &&
        blocker !== "Evidence review requested",
    ),
  });
}

export function canSubmitStageCompletion(stage: StageRecord) {
  const requiredItems = stage.evidenceItems.filter((item) => item.required);

  if (requiredItems.length === 0) {
    return false;
  }

  return requiredItems.every((item) => item.status === "accepted" || item.status === "reviewed");
}

export function submitMobileEvidence(stageId: string, input: MobileEvidenceSubmissionInput, actorRole: UserRole = "delivery") {
  if (!hasPermission(actorRole, "submit-evidence")) {
    return permissionDeniedResult("This user cannot submit evidence.");
  }

  const stage = getStageById(stageId);

  if (!stage) {
    return {
      success: false,
      message: "Stage could not be found.",
      postActionState: null,
    };
  }

  const timestamp = new Date().toISOString();
  const previousState = snapshotStageState(stage);
  const existingIndex = stage.evidenceItems.findIndex((item) => item.name === input.evidenceName);
  const nextEvidenceItems = [...stage.evidenceItems];

  if (existingIndex >= 0) {
    nextEvidenceItems[existingIndex] = {
      ...nextEvidenceItems[existingIndex],
      type: input.evidenceType,
      status: "reviewed",
      submissionState: "submitted",
      uploadedBy: input.submittedBy,
      uploadedAt: timestamp,
      uploadPlaceholder: input.uploadPlaceholder,
      submissionNote: input.note,
      reviewerNote: undefined,
    };
  } else {
    nextEvidenceItems.push({
      id: createAuditId("evidence"),
      name: input.evidenceName,
      type: input.evidenceType,
      status: "reviewed",
      submissionState: "submitted",
      required: stage.requiredEvidence.includes(input.evidenceName),
      uploadedBy: input.submittedBy,
      uploadedAt: timestamp,
      uploadPlaceholder: input.uploadPlaceholder,
      submissionNote: input.note,
    });
  }

  updateStageEvidence(stageId, nextEvidenceItems);
  const nextStage = getStageById(stageId);

  appendAdministrativeAuditEntry({
    actionKey: "mobile-submit-evidence",
    contractId: stage.contractId,
    stageId,
    entityType: "stage",
    previousState,
    newState: snapshotStageState(nextStage),
    message: `${stage.name} evidence submitted from mobile operations.`,
  });

  return {
    success: true,
    message: `${input.evidenceName} submitted for ${stage.name}.`,
    postActionState: buildPostActionStateSummary([stageId]),
  };
}

export function submitStageCompletion(stageId: string, actorRole: UserRole = "delivery") {
  if (!hasPermission(actorRole, "submit-completion")) {
    return permissionDeniedResult("This user cannot submit stage completion.");
  }

  const stage = getStageById(stageId);

  if (!stage) {
    return {
      success: false,
      message: "Stage could not be found.",
      postActionState: null,
    };
  }

  if (!canSubmitStageCompletion(stage)) {
    return {
      success: false,
      message: "Minimum evidence requirements are not yet met for completion.",
      postActionState: buildPostActionStateSummary([stageId]),
    };
  }

  const previousState = snapshotStageState(stage);
  updateStage(stageId, {
    completionState: "submitted",
    status: "reviewed",
  });
  const nextStage = getStageById(stageId);

  appendAdministrativeAuditEntry({
    actionKey: "mobile-submit-completion",
    contractId: stage.contractId,
    stageId,
    entityType: "stage",
    previousState,
    newState: snapshotStageState(nextStage),
    message: `${stage.name} completion submitted from mobile operations.`,
  });

  return {
    success: true,
    message: `${stage.name} completion submitted.`,
    postActionState: buildPostActionStateSummary([stageId]),
  };
}

export function reviewStageApproval(stageId: string, role: ApprovalRole, action: MobileApprovalAction, actorRole: UserRole = role) {
  if (
    action === "approve" &&
    !hasPermission(actorRole, "approve", { requiredApprovalRole: role })
  ) {
    return permissionDeniedResult("This user cannot approve for that role.");
  }

  if (
    action === "reject" &&
    !hasPermission(actorRole, "reject", { requiredApprovalRole: role })
  ) {
    return permissionDeniedResult("This user cannot reject for that role.");
  }

  if (
    action === "request-more" &&
    !hasPermission(actorRole, "request-more", { requiredApprovalRole: role })
  ) {
    return permissionDeniedResult("This user cannot request more information for that role.");
  }

  const stage = getStageById(stageId);

  if (!stage) {
    return {
      success: false,
      message: "Stage could not be found.",
      postActionState: null,
    };
  }

  if (action === "approve") {
    const previousState = snapshotStageState(stage);
    const result = updateStageApproval(stageId, role, "approved");

    appendAdministrativeAuditEntry({
      actionKey: `mobile-approve-${role}`,
      contractId: stage.contractId,
      stageId,
      entityType: "stage",
      previousState,
      newState: snapshotStageState(getStageById(stageId)),
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} approved ${stage.name} from mobile operations.`,
    });

    return result;
  }

  if (action === "reject") {
    const previousState = snapshotStageState(stage);
    const result = updateStageApproval(stageId, role, "rejected");

    appendAdministrativeAuditEntry({
      actionKey: `mobile-reject-${role}`,
      contractId: stage.contractId,
      stageId,
      entityType: "stage",
      previousState,
      newState: snapshotStageState(getStageById(stageId)),
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} rejected ${stage.name} from mobile operations.`,
    });

    return result;
  }

  const previousState = snapshotStageState(stage);
  const nextEvidenceItems = stage.evidenceItems.map((item, index) =>
    index === 0 && item.required
      ? {
          ...item,
          status: "pending" as const,
          submissionState: "request-more" as const,
          reviewerNote: `${role.charAt(0).toUpperCase() + role.slice(1)} requested more information`,
        }
      : item,
  );

  updateStageEvidence(stageId, nextEvidenceItems);
  updateStage(stageId, {
    approvals: {
      ...stage.approvals,
      [role]: "pending",
    },
    completionState: "returned",
  });
  const nextStage = getStageById(stageId);

  appendAdministrativeAuditEntry({
    actionKey: `mobile-request-more-${role}`,
    contractId: stage.contractId,
    stageId,
    entityType: "stage",
    previousState,
    newState: snapshotStageState(nextStage),
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} requested more information for ${stage.name}.`,
  });

  return {
    success: true,
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} requested more information.`,
    postActionState: buildPostActionStateSummary([stageId]),
  };
}

export function updateStageApproval(stageId: string, role: ApprovalRole, decision: ApprovalDecision) {
  const stage = getStageById(stageId);

  if (!stage) {
    return {
      success: false,
      message: "Stage could not be found.",
      postActionState: null,
    };
  }

  if (!canActOnApproval(stage, role)) {
    return {
      success: false,
      message:
        role === "treasury"
          ? "Treasury approval is locked until professional and commercial approvals complete."
          : "Commercial approval is locked until professional approval completes.",
      postActionState: buildPostActionStateSummary([stageId]),
    };
  }

  updateStage(stageId, {
    approvals: {
      ...stage.approvals,
      [role]: decision,
    },
  });

  return {
    success: true,
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} approval marked ${decision}.`,
    postActionState: buildPostActionStateSummary([stageId]),
  };
}

export function isApprovalActionKey(actionKey: string): actionKey is ApprovalActionKey {
  return approvalActionKeys.includes(actionKey as ApprovalActionKey);
}

export function getApprovalActionKey(role: ApprovalRole): ApprovalActionKey {
  return `approve-${role}` as ApprovalActionKey;
}

export function parseApprovalActionKey(actionKey: string): ApprovalRole | null {
  if (!isApprovalActionKey(actionKey)) {
    return null;
  }

  return actionKey.replace("approve-", "") as ApprovalRole;
}

const queueActionRegistry: Record<QueueActionKey, QueueActionDefinition> = {
  "approve-professional": {
    key: "approve-professional",
    type: "approval",
    requiresStage: true,
  },
  "approve-commercial": {
    key: "approve-commercial",
    type: "approval",
    requiresStage: true,
  },
  "approve-treasury": {
    key: "approve-treasury",
    type: "approval",
    requiresStage: true,
  },
  "release-funding": {
    key: "release-funding",
    type: "funding",
    requiresStage: false,
  },
  "add-funds": {
    key: "add-funds",
    type: "funding",
    requiresStage: false,
  },
  "allocate-stage-funding": {
    key: "allocate-stage-funding",
    type: "funding",
    requiresStage: true,
  },
  "adjust-buffer": {
    key: "adjust-buffer",
    type: "funding",
    requiresStage: false,
  },
  "review-dispute": {
    key: "review-dispute",
    type: "dispute",
    requiresStage: true,
  },
  "review-variation": {
    key: "review-variation",
    type: "variation",
    requiresStage: true,
  },
  "review-evidence": {
    key: "review-evidence",
    type: "evidence",
    requiresStage: true,
  },
  "review-audit": {
    key: "review-audit",
    type: "audit",
    requiresStage: true,
  },
  "record-completion": {
    key: "record-completion",
    type: "completion",
    requiresStage: true,
  },
  "mark-ready": {
    key: "mark-ready",
    type: "readiness",
    requiresStage: true,
  },
};

type QueueActionHandler = (stage: StageRecord | null) => QueueActionExecutionResult;

const queueActionHandlers: Record<QueueActionKey, QueueActionHandler> = {
  "approve-professional": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    return executeApprovalAction(stage.id, "approve-professional", "approved");
  },
  "approve-commercial": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    return executeApprovalAction(stage.id, "approve-commercial", "approved");
  },
  "approve-treasury": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    return executeApprovalAction(stage.id, "approve-treasury", "approved");
  },
  "release-funding": () => {
    const affectedStageIds = snapshot.stages.filter((stage) => !stage.fundingGate).map((stage) => stage.id);
    const projectIds = Array.from(
      new Set(
        snapshot.contracts
          .filter((contract) => affectedStageIds.some((stageId) => snapshot.stages.find((stage) => stage.id === stageId)?.contractId === contract.id))
          .map((contract) => contract.projectId),
      ),
    );

    projectIds.forEach((projectId) => syncFundingForProject(projectId));

    return {
      success: true,
      message: "Funding gates re-evaluated from the shared cashflow model.",
      postActionState: buildPostActionStateSummary(affectedStageIds),
    };
  },
  "add-funds": () => {
    const projectId = snapshot.projectFunding[0]?.projectId;

    if (!projectId) {
      return permissionDeniedResult("No project funding record is available.");
    }

    return addProjectFunds(projectId, 75000);
  },
  "allocate-stage-funding": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    return allocateFundsToStage(stage.id, getStageRemainingFundingRequirement(stage));
  },
  "adjust-buffer": () => {
    const funding = snapshot.projectFunding[0];

    if (!funding) {
      return permissionDeniedResult("No project funding record is available.");
    }

    return adjustProjectFundingBuffer(funding.projectId, Math.max(funding.bufferAmount - 10000, 0));
  },
  "review-dispute": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    updateStage(stage.id, {
      disputes: stage.disputes.map((dispute) =>
        dispute.status === "open" ? { ...dispute, status: "resolved" } : dispute,
      ),
    });

    return {
      success: true,
      message: `${stage.name} dispute marked as reviewed.`,
      postActionState: buildPostActionStateSummary([stage.id]),
    };
  },
  "review-variation": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    updateStage(stage.id, {
      fundingGate: true,
      variations: stage.variations.map((variation) =>
        variation.status === "pending" ? { ...variation, status: "approved" } : variation,
      ),
    });

    return {
      success: true,
      message: `${stage.name} variation marked ready for review.`,
      postActionState: buildPostActionStateSummary([stage.id]),
    };
  },
  "review-evidence": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    updateStage(stage.id, {
      evidenceItems: stage.evidenceItems.map((item, index) =>
        index === 0 && item.required
          ? {
              ...item,
              status: "pending",
              submissionState: "request-more",
              reviewerNote: "Evidence review requested",
            }
          : item,
      ),
      evidenceStatus: "pending",
      status: "at-risk",
      blockers: ["Evidence review requested"],
    });

    return {
      success: true,
      message: `${stage.name} moved into evidence review.`,
      postActionState: buildPostActionStateSummary([stage.id]),
    };
  },
  "review-audit": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    updateStage(stage.id, {
      status: "reviewed",
    });

    return {
      success: true,
      message: `${stage.name} audit acknowledged.`,
      postActionState: buildPostActionStateSummary([stage.id]),
    };
  },
  "record-completion": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    return submitStageCompletion(stage.id);
  },
  "mark-ready": (stage) => {
    if (!stage) {
      return {
        success: false,
        message: "Linked stage could not be found.",
        postActionState: null,
      };
    }

    updateStage(stage.id, {
      status: "reviewed",
      blockers: [],
    });

    return {
      success: true,
      message: `${stage.name} marked ready for next step.`,
      postActionState: buildPostActionStateSummary([stage.id]),
    };
  },
};

export function isQueueActionKey(actionKey: string): actionKey is QueueActionKey {
  return actionKey in queueActionRegistry;
}

export function getQueueActionDefinition(actionKey: string): QueueActionDefinition | null {
  return isQueueActionKey(actionKey) ? queueActionRegistry[actionKey] : null;
}

export function executeApprovalAction(stageId: string, actionKey: string, decision: ApprovalDecision = "approved") {
  const role = parseApprovalActionKey(actionKey);

  if (!role) {
    return {
      success: false,
      message: `No approval role mapping found for ${actionKey}.`,
      postActionState: buildPostActionStateSummary([stageId]),
    };
  }

  return updateStageApproval(stageId, role, decision);
}

export function executeQueueAction(actionKey: string, stageId?: string): QueueActionExecutionResult {
  const timestamp = new Date().toISOString();
  const actionDefinition = getQueueActionDefinition(actionKey);

  if (!actionDefinition) {
    const result = {
      success: false,
      message: `No execution handler configured for ${actionKey}.`,
      postActionState: null,
    };

    appendAuditEntries([
      {
        id: `audit-${timestamp}-${actionKey}-none`,
        actionKey,
        stageId: stageId ?? null,
        timestamp,
        previousState: snapshotStageState(stageId ? getStageById(stageId) : null),
        newState: snapshotStageState(stageId ? getStageById(stageId) : null),
        success: result.success,
        message: result.message,
      },
    ]);

    return result;
  }

  if (actionDefinition.requiresStage && !stageId) {
    const result = {
      success: false,
      message: "No linked stage available for this action.",
      postActionState: null,
    };

    appendAuditEntries([
      {
        id: `audit-${timestamp}-${actionKey}-none`,
        actionKey,
        stageId: null,
        timestamp,
        previousState: null,
        newState: null,
        success: result.success,
        message: result.message,
      },
    ]);

    return result;
  }

  const priorStages = new Map(
    snapshot.stages.map((stage) => [stage.id, snapshotStageState(stage)]),
  );
  const stage = stageId ? getStageById(stageId) : null;
  const result = queueActionHandlers[actionDefinition.key](stage);
  const affectedStageIds = result.postActionState?.affectedStageIds ?? (stageId ? [stageId] : []);
  const uniqueAffectedStageIds = Array.from(new Set(affectedStageIds));

  if (uniqueAffectedStageIds.length === 0) {
    appendAuditEntries([
      {
        id: `audit-${timestamp}-${actionKey}-none`,
        actionKey,
        stageId: stageId ?? null,
        timestamp,
        previousState: snapshotStageState(stage),
        newState: snapshotStageState(stageId ? getStageById(stageId) : null),
        success: result.success,
        message: result.message,
      },
    ]);

    return result;
  }

  appendAuditEntries(
    uniqueAffectedStageIds.map((affectedStageId, index) => ({
      id: `audit-${timestamp}-${actionKey}-${affectedStageId}-${index}`,
      actionKey,
      stageId: affectedStageId,
      timestamp,
      previousState: priorStages.get(affectedStageId) ?? null,
      newState: snapshotStageState(getStageById(affectedStageId)),
      success: result.success,
      message: result.message,
    })),
  );

  return result;
}

export function useStageStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    addProjectFunds,
    adjustProjectFundingBuffer,
    allocateFundsToStage,
    amendContract,
    amendStage,
    auditLog: state.auditLog,
    canActOnApproval,
    canSubmitStageCompletion,
    contracts: state.contracts,
    createContract,
    createStage,
    executeApprovalAction,
    executeQueueAction,
    getApprovalActionKey,
    getAuditLog,
    getContractById,
    getContracts,
    getNotifications,
    getProjectById,
    getProjectFunding,
    getProjectFundingById,
    getProjects,
    getQueueActionDefinition,
    getStageById,
    getStageRemainingFundingRequirement,
    getUserById,
    getUsers,
    isStageFundingEligible,
    isApprovalActionKey,
    isQueueActionKey,
    notifications: state.notifications,
    parseApprovalActionKey,
    reconcileNotifications,
    reviewStageApproval,
    resubmitContract,
    resubmitStage,
    setContractLifecycle,
    submitMobileEvidence,
    submitStageCompletion,
    updateNotificationStatus,
    stages: state.stages,
    projects: state.projects,
    projectFunding: state.projectFunding,
    updateContract,
    updateStage,
    updateStageApproval,
    updateStageAdministration,
    updateStageEvidence,
    users: state.users,
  };
}
