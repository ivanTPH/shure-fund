export type ApprovalStepState = "Complete" | "Current" | "Pending" | "Blocked";
export type ApprovalStageKey = "professional" | "commercial" | "treasury" | "released";

export type ApprovalChainStep = {
  id: string;
  label: string;
  state: ApprovalStepState;
  actor?: string;
  timestamp?: string;
};

export type ApprovalAuditEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
};

export type ApprovalReleaseRecord = {
  contractId: string;
  projectId: string;
  packageReference: string;
  submittedBy: string;
  deliveryParty: string;
  approvalStage: ApprovalStageKey;
  priorApprovals: string[];
  currentReviewer: string;
  nextApprover: string;
  fundingState: string;
  releasableAmount: number;
  heldAmount: number;
  releaseEligible: boolean;
  releasedAmount?: number;
  releaseTimestamp?: string;
  releasedBy?: string;
  explanation: string;
  chain: ApprovalChainStep[];
  audit: ApprovalAuditEvent[];
};

export const approvalReleaseRecords: ApprovalReleaseRecord[] = [
  {
    contractId: "contract-steel-frame",
    projectId: "project-brent-cross",
    packageReference: "Stage / Steel frame package",
    submittedBy: "Liam Price",
    deliveryParty: "Northline Structures Ltd",
    approvalStage: "professional",
    priorApprovals: ["Internal supplier sign-off complete"],
    currentReviewer: "Professional assurance",
    nextApprover: "Commercial approval",
    fundingState: "Awaiting professional assurance",
    releasableAmount: 0,
    heldAmount: 0,
    releaseEligible: false,
    explanation: "Evidence is complete, but professional assurance must complete before the commercial approver can take over.",
    chain: [
      { id: "steel-supplier", label: "Submitted by supplier", state: "Complete", actor: "Liam Price", timestamp: "10 Apr 2026, 08:45" },
      { id: "steel-internal", label: "Internal supplier sign-off", state: "Complete", actor: "Martha Webb", timestamp: "10 Apr 2026, 09:10" },
      { id: "steel-professional", label: "Professional assurance", state: "Current" },
      { id: "steel-commercial", label: "Commercial approval", state: "Pending" },
      { id: "steel-treasury", label: "Treasury / release", state: "Pending" },
    ],
    audit: [
      { id: "steel-a1", label: "Evidence uploaded", detail: "Completion photos and fire treatment certificate were uploaded.", timestamp: "09 Apr 2026" },
      { id: "steel-a2", label: "Internal approval complete", detail: "Commercial manager confirmed the submitted pack is complete.", timestamp: "10 Apr 2026" },
      { id: "steel-a3", label: "Submitted for sign-off", detail: "The package moved into professional assurance review.", timestamp: "10 Apr 2026" },
      { id: "steel-a4", label: "Current review stage", detail: "Professional assurance is the current reviewing authority.", timestamp: "11 Apr 2026" },
    ],
  },
  {
    contractId: "contract-commissioning",
    projectId: "project-brent-cross",
    packageReference: "Stage / M&E final commissioning",
    submittedBy: "Nadia Cole",
    deliveryParty: "Prime Building Services",
    approvalStage: "commercial",
    priorApprovals: ["Internal supplier sign-off complete", "Professional assurance complete"],
    currentReviewer: "Commercial approval",
    nextApprover: "Treasury / release",
    fundingState: "Awaiting commercial approval",
    releasableAmount: 0,
    heldAmount: 0,
    releaseEligible: false,
    explanation: "Professional assurance is complete and the package now needs commercial approval before treasury can release funds.",
    chain: [
      { id: "comm-supplier", label: "Submitted by supplier", state: "Complete", actor: "Nadia Cole", timestamp: "10 Apr 2026, 12:20" },
      { id: "comm-internal", label: "Internal supplier sign-off", state: "Complete", actor: "Nadia Cole", timestamp: "10 Apr 2026, 12:35" },
      { id: "comm-professional", label: "Professional assurance", state: "Complete", actor: "Owen Blake", timestamp: "10 Apr 2026, 13:10" },
      { id: "comm-commercial", label: "Commercial approval", state: "Current" },
      { id: "comm-treasury", label: "Treasury / release", state: "Pending" },
    ],
    audit: [
      { id: "comm-a1", label: "Evidence uploaded", detail: "Commissioning certificates and marked-up drawings were submitted.", timestamp: "10 Apr 2026" },
      { id: "comm-a2", label: "Internal approval complete", detail: "The package was checked by the supplier team.", timestamp: "10 Apr 2026" },
      { id: "comm-a3", label: "Professional assurance complete", detail: "Professional review cleared the package to move on.", timestamp: "10 Apr 2026" },
      { id: "comm-a4", label: "Current review stage", detail: "Commercial approval is now the active review stage.", timestamp: "11 Apr 2026" },
    ],
  },
  {
    contractId: "contract-cladding-release",
    projectId: "project-brent-cross",
    packageReference: "Stage / Cladding release package",
    submittedBy: "Oliver Reed",
    deliveryParty: "Skyline Envelope Ltd",
    approvalStage: "treasury",
    priorApprovals: ["Internal supplier sign-off complete", "Professional assurance complete", "Commercial approval complete"],
    currentReviewer: "Treasury / release",
    nextApprover: "Release payment",
    fundingState: "Available to release",
    releasableAmount: 455000,
    heldAmount: 0,
    releaseEligible: true,
    explanation: "The full approval chain is complete and the approved amount is now available to release.",
    chain: [
      { id: "clad-supplier", label: "Submitted by supplier", state: "Complete", actor: "Oliver Reed", timestamp: "09 Apr 2026, 09:20" },
      { id: "clad-internal", label: "Internal supplier sign-off", state: "Complete", actor: "Oliver Reed", timestamp: "09 Apr 2026, 10:00" },
      { id: "clad-professional", label: "Professional assurance", state: "Complete", actor: "Owen Blake", timestamp: "09 Apr 2026, 11:20" },
      { id: "clad-commercial", label: "Commercial approval", state: "Complete", actor: "Maya Singh", timestamp: "09 Apr 2026, 12:15" },
      { id: "clad-treasury", label: "Treasury / release", state: "Current" },
    ],
    audit: [
      { id: "clad-a1", label: "Evidence uploaded", detail: "Completion photos and certificates were uploaded.", timestamp: "09 Apr 2026" },
      { id: "clad-a2", label: "Approval chain complete", detail: "All approval stages completed and the package is ready for release.", timestamp: "10 Apr 2026" },
      { id: "clad-a3", label: "Current review stage", detail: "Treasury is now the final release authority.", timestamp: "11 Apr 2026" },
    ],
  },
  {
    contractId: "contract-roofing",
    projectId: "project-brent-cross",
    packageReference: "Stage / Roofing and waterproofing",
    submittedBy: "Ava Singh",
    deliveryParty: "WeatherSeal Roofing Ltd",
    approvalStage: "treasury",
    priorApprovals: ["Internal supplier sign-off complete", "Professional assurance complete", "Commercial approval complete"],
    currentReviewer: "Treasury / release",
    nextApprover: "Funding issue review",
    fundingState: "Held due to funding gap",
    releasableAmount: 110000,
    heldAmount: 280000,
    releaseEligible: false,
    explanation: "Approval is in place for the currently certified value, but a funding gap means the full amount cannot yet be released.",
    chain: [
      { id: "roof-supplier", label: "Submitted by supplier", state: "Complete", actor: "Ava Singh", timestamp: "10 Apr 2026, 07:55" },
      { id: "roof-internal", label: "Internal supplier sign-off", state: "Complete", actor: "Ava Singh", timestamp: "10 Apr 2026, 08:05" },
      { id: "roof-professional", label: "Professional assurance", state: "Complete", actor: "Owen Blake", timestamp: "10 Apr 2026, 08:30" },
      { id: "roof-commercial", label: "Commercial approval", state: "Complete", actor: "Maya Singh", timestamp: "10 Apr 2026, 09:00" },
      { id: "roof-treasury", label: "Treasury / release", state: "Blocked" },
    ],
    audit: [
      { id: "roof-a1", label: "Evidence uploaded", detail: "Progress photos and supporting note were submitted.", timestamp: "10 Apr 2026" },
      { id: "roof-a2", label: "Approval chain complete", detail: "The package was approved through internal, professional, and commercial review.", timestamp: "10 Apr 2026" },
      { id: "roof-a3", label: "Funding issue raised", detail: "Treasury held the package due to a current funding gap.", timestamp: "11 Apr 2026" },
    ],
  },
  {
    contractId: "contract-groundworks",
    projectId: "project-salford-quays",
    packageReference: "Stage / Groundworks and drainage",
    submittedBy: "George Millar",
    deliveryParty: "Northwest Civils LLP",
    approvalStage: "treasury",
    priorApprovals: ["Internal supplier sign-off complete"],
    currentReviewer: "Dispute review",
    nextApprover: "Commercial resolution",
    fundingState: "Frozen in dispute",
    releasableAmount: 0,
    heldAmount: 260000,
    releaseEligible: false,
    explanation: "The package is frozen because the disputed scope must be resolved before release can continue.",
    chain: [
      { id: "gw-supplier", label: "Submitted by supplier", state: "Complete", actor: "George Millar", timestamp: "08 Apr 2026, 15:40" },
      { id: "gw-internal", label: "Internal supplier sign-off", state: "Complete", actor: "George Millar", timestamp: "08 Apr 2026, 16:05" },
      { id: "gw-professional", label: "Professional assurance", state: "Blocked" },
      { id: "gw-commercial", label: "Commercial approval", state: "Blocked" },
      { id: "gw-treasury", label: "Treasury / release", state: "Blocked" },
    ],
    audit: [
      { id: "gw-a1", label: "Evidence uploaded", detail: "Drainage logs and variation note were submitted.", timestamp: "08 Apr 2026" },
      { id: "gw-a2", label: "Dispute opened", detail: "Held value was frozen pending clarification on omitted works.", timestamp: "10 Apr 2026" },
      { id: "gw-a3", label: "Current review stage", detail: "The package is frozen in dispute and cannot move to release.", timestamp: "11 Apr 2026" },
    ],
  },
];

export function getApprovalReleaseRecord(contractId: string) {
  return approvalReleaseRecords.find((record) => record.contractId === contractId);
}
