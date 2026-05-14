export type FundingStatus = "Funded" | "At risk" | "Proof of funds pending";

export type ContractStatus =
  | "Draft"
  | "Issued"
  | "Accepted"
  | "Returned"
  | "Rejected"
  | "Cancelled"
  | "Active"
  | "Completed"
  | "Sent"
  | "In progress"
  | "Awaiting sign-off"
  | "Available to release"
  | "Released"
  | "Disputed";

export type EvidenceGroup = "Photos" | "Certificates / PDFs" | "Notes" | "Drawings";

export type ApprovalState = "Pending" | "Ready to approve" | "Approved" | "Returned";
export type EvidenceItemStatus = "Submitted" | "Reviewed";

export interface EvidenceItem {
  id: string;
  group: EvidenceGroup;
  title: string;
  type: "Photo" | "Certificate" | "PDF" | "Note" | "Drawing" | "Delivery note";
  uploadedBy: string;
  role: string;
  timestamp: string;
  status: EvidenceItemStatus;
}

export interface ContractRecord {
  id: string;
  title: string;
  packageType?: string;
  scopeSummary: string;
  supplier: string;
  supplierContactId?: string;
  supplierStatus?: "Unassigned" | "Invited" | "Accepted";
  authority: string;
  authorityContactId?: string;
  parentProjectId?: string;
  parentContractId?: string;
  postcode?: string;
  what3words?: string;
  permissions?: {
    signOffAuthority?: boolean;
    paymentAuthority?: boolean;
    authorityName?: string;
  };
  startDate: string;
  endDate: string;
  value: number;
  progressPercent: number;
  status: ContractStatus;
  statusSummary: string;
  fundingState: "Banked" | "Proof of funds pending" | "Available to release" | "Released" | "Blocked";
  nextAction: string;
  nextActionLabel: "Upload evidence" | "Request sign-off" | "View approval status" | "View funds" | "Review contract";
  commentsPreview: string;
  approvedValue: number;
  submittedBy: string;
  currentReviewer: string;
  nextApprover: string;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  attachmentsSummary: string[];
  filesSummary: {
    totalFiles: number;
    certificates: number;
    photos: number;
    notes: number;
  };
  approvalState: ApprovalState;
  evidence: EvidenceItem[];
  timeline: Array<{ id: string; label: string; detail: string; timestamp: string }>;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  location: string;
  postcode?: string;
  what3words?: string;
  budgetValue?: number;
  permissions?: {
    signOffAuthority?: boolean;
    paymentAuthority?: boolean;
    authorityName?: string;
    paymentAuthorityName?: string;
  };
  attachmentsSummary?: string[];
  totalValue: number;
  fundingStatus: FundingStatus;
  fundingSummary: string;
  dateRange: string;
  projectFilesSummary: string;
  actionCue: string;
  contracts: ContractRecord[];
}

export const prototypeProjects: ProjectRecord[] = [
  {
    id: "project-brent-cross",
    name: "Brent Cross Phase 1",
    location: "London",
    totalValue: 2450000,
    fundingStatus: "Funded",
    fundingSummary: "£1.18m in bank account balance, £860k available to release, proof of funds aligned.",
    dateRange: "Apr 2026 - Dec 2026",
    projectFilesSummary: "18 project files, 6 signed documents, 3 live comments",
    actionCue: "Open contracts awaiting sign-off",
    contracts: [
      {
        id: "contract-steel-frame",
        title: "Steel frame package",
        scopeSummary: "Primary steel frame supply, install, fire coating, and completion pack.",
        supplier: "Northline Structures Ltd",
        authority: "Commercial Director",
        startDate: "2026-04-12",
        endDate: "2026-07-18",
        value: 680000,
        progressPercent: 72,
        status: "Awaiting sign-off",
        statusSummary: "Evidence is complete and the package is ready for sign-off before it can enter the approval chain.",
        fundingState: "Available to release",
        nextAction: "Request professional sign-off",
        nextActionLabel: "Request sign-off",
        commentsPreview: "Installer has uploaded fire treatment certificates and marked the final bay as complete.",
        approvedValue: 420000,
        submittedBy: "Liam Price",
        currentReviewer: "Commercial Manager",
        nextApprover: "Treasury Manager",
        checklist: [
          { id: "steel-1", label: "Signed subcontract in place", done: true },
          { id: "steel-2", label: "Completion photos uploaded", done: true },
          { id: "steel-3", label: "Fire certificate reviewed", done: true },
          { id: "steel-4", label: "Professional sign-off", done: false },
        ],
        attachmentsSummary: ["Subcontract pack", "Programme extract", "Fire certificate", "Marked-up photos"],
        filesSummary: { totalFiles: 9, certificates: 3, photos: 4, notes: 2 },
        approvalState: "Ready to approve",
        evidence: [
          {
            id: "steel-e-1",
            group: "Photos",
            title: "Frame completion photos - bay 4",
            type: "Photo",
            uploadedBy: "Liam Price",
            role: "Site Manager",
            timestamp: "10 Apr 2026, 08:45",
            status: "Reviewed",
          },
          {
            id: "steel-e-2",
            group: "Certificates / PDFs",
            title: "Fire treatment certificate",
            type: "Certificate",
            uploadedBy: "Martha Webb",
            role: "Commercial Manager",
            timestamp: "09 Apr 2026, 16:20",
            status: "Reviewed",
          },
          {
            id: "steel-e-3",
            group: "Notes",
            title: "Installer note on final tolerance check",
            type: "Note",
            uploadedBy: "Liam Price",
            role: "Site Manager",
            timestamp: "10 Apr 2026, 09:02",
            status: "Submitted",
          },
          {
            id: "steel-e-4",
            group: "Drawings",
            title: "Marked-up connection drawing",
            type: "Drawing",
            uploadedBy: "Martha Webb",
            role: "Commercial Manager",
            timestamp: "09 Apr 2026, 14:55",
            status: "Reviewed",
          },
        ],
        timeline: [
          { id: "steel-t-1", label: "Evidence updated", detail: "Fire treatment certificate uploaded.", timestamp: "09 Apr 2026" },
          { id: "steel-t-2", label: "Progress certified", detail: "72% of package value marked complete.", timestamp: "08 Apr 2026" },
          { id: "steel-t-3", label: "Awaiting sign-off", detail: "Commercial review passed to professional review.", timestamp: "07 Apr 2026" },
        ],
      },
      {
        id: "contract-electrical-first-fix",
        title: "Electrical first fix",
        scopeSummary: "Containment, cable tray, first fix wiring, and inspection evidence for warehouse zones A-D.",
        supplier: "Northline Electrical Ltd",
        authority: "Project Director",
        startDate: "2026-05-01",
        endDate: "2026-08-03",
        value: 390000,
        progressPercent: 44,
        status: "In progress",
        statusSummary: "Evidence was returned by QS and must be resubmitted before certification can proceed.",
        fundingState: "Banked",
        nextAction: "Resubmit returned evidence",
        nextActionLabel: "Upload evidence",
        commentsPreview: "Weather delay recorded against zones C and D; partial works continuing.",
        approvedValue: 128000,
        submittedBy: "Lena Ward",
        currentReviewer: "Package Manager",
        nextApprover: "Commercial Manager",
        checklist: [
          { id: "roof-1", label: "Scope signed off", done: true },
          { id: "roof-2", label: "Progress photos uploaded", done: false },
          { id: "roof-3", label: "Supplier note added", done: true },
          { id: "roof-4", label: "Payment request prepared", done: false },
        ],
        attachmentsSummary: ["Scope sheet", "Programme note", "Weather delay note"],
        filesSummary: { totalFiles: 5, certificates: 1, photos: 2, notes: 2 },
        approvalState: "Pending",
        evidence: [
          {
            id: "roof-e-1",
            group: "Photos",
            title: "Zone C membrane progress",
            type: "Photo",
            uploadedBy: "Ava Singh",
            role: "Package Manager",
            timestamp: "10 Apr 2026, 07:55",
            status: "Submitted",
          },
          {
            id: "roof-e-2",
            group: "Notes",
            title: "Weather delay note",
            type: "Note",
            uploadedBy: "Ava Singh",
            role: "Package Manager",
            timestamp: "09 Apr 2026, 18:12",
            status: "Submitted",
          },
          {
            id: "roof-e-3",
            group: "Drawings",
            title: "Marked-up roof zone drawing",
            type: "Drawing",
            uploadedBy: "Ava Singh",
            role: "Package Manager",
            timestamp: "09 Apr 2026, 18:30",
            status: "Submitted",
          },
        ],
        timeline: [
          { id: "roof-t-1", label: "Supplier note added", detail: "Weather delay logged against programme.", timestamp: "09 Apr 2026" },
          { id: "roof-t-2", label: "Progress updated", detail: "44% complete against certified scope.", timestamp: "08 Apr 2026" },
        ],
      },
      {
        id: "contract-materials-supply",
        title: "Materials supply package",
        scopeSummary: "Structural fixings, containment materials, delivery notes, and supplier invoice pack.",
        supplier: "Atlas Materials Supply Co",
        authority: "Commercial Director",
        startDate: "2026-07-01",
        endDate: "2026-08-21",
        value: 310000,
        progressPercent: 96,
        status: "Accepted",
        statusSummary: "Evidence is complete and the package is now waiting within the approval flow.",
        fundingState: "Banked",
        nextAction: "Monitor approval progress",
        nextActionLabel: "View approval status",
        commentsPreview: "Commissioning records have been submitted and the package is now awaiting reviewer decisions.",
        approvedValue: 295000,
        submittedBy: "Samira Khan",
        currentReviewer: "Professional reviewer",
        nextApprover: "Treasury Manager",
        checklist: [
          { id: "comm-1", label: "Commissioning sheet uploaded", done: true },
          { id: "comm-2", label: "Completion certificate uploaded", done: true },
          { id: "comm-3", label: "Marked-up drawing uploaded", done: true },
          { id: "comm-4", label: "Approval route active", done: true },
        ],
        attachmentsSummary: ["Commissioning sheet", "Completion certificate", "Marked-up drawing"],
        filesSummary: { totalFiles: 6, certificates: 2, photos: 1, notes: 1 },
        approvalState: "Pending",
        evidence: [
          {
            id: "comm-e-1",
            group: "Certificates / PDFs",
            title: "Commissioning certificate pack",
            type: "Certificate",
            uploadedBy: "Nadia Cole",
            role: "Commissioning Lead",
            timestamp: "10 Apr 2026, 12:20",
            status: "Reviewed",
          },
          {
            id: "comm-e-2",
            group: "Drawings",
            title: "Marked-up commissioning drawing",
            type: "Drawing",
            uploadedBy: "Nadia Cole",
            role: "Commissioning Lead",
            timestamp: "10 Apr 2026, 12:40",
            status: "Reviewed",
          },
        ],
        timeline: [
          { id: "comm-t-1", label: "Submitted for approval", detail: "Package moved into the approval route.", timestamp: "10 Apr 2026" },
          { id: "comm-t-2", label: "Evidence reviewed", detail: "Commissioning files were checked and accepted.", timestamp: "09 Apr 2026" },
        ],
      },
      {
        id: "contract-groundworks",
        title: "Groundworks and drainage",
        scopeSummary: "Drainage runs, attenuation tank install, slab preparation, and variation clarification.",
        supplier: "Northwest Civils LLP",
        authority: "Project Director",
        startDate: "2026-06-03",
        endDate: "2026-08-14",
        value: 455000,
        progressPercent: 100,
        status: "Disputed",
        statusSummary: "An active drainage variation dispute freezes only the disputed value.",
        fundingState: "Blocked",
        nextAction: "Review dispute",
        nextActionLabel: "Review contract",
        commentsPreview: "Undisputed value remains visible while the variation is clarified.",
        approvedValue: 540000,
        submittedBy: "Daniel Hart",
        currentReviewer: "Owen Blake",
        nextApprover: "Treasury Manager",
        checklist: [
          { id: "clad-1", label: "Completion photos uploaded", done: true },
          { id: "clad-2", label: "Completion certificate uploaded", done: true },
          { id: "clad-3", label: "Marked-up drawing uploaded", done: true },
          { id: "clad-4", label: "Release route cleared", done: true },
        ],
        attachmentsSummary: ["Completion photos", "Completion certificate", "Release note"],
        filesSummary: { totalFiles: 8, certificates: 2, photos: 3, notes: 2 },
        approvalState: "Approved",
        evidence: [
          {
            id: "clad-e-1",
            group: "Photos",
            title: "Completed facade photos",
            type: "Photo",
            uploadedBy: "Oliver Reed",
            role: "Project Lead",
            timestamp: "10 Apr 2026, 09:20",
            status: "Reviewed",
          },
          {
            id: "clad-e-2",
            group: "Certificates / PDFs",
            title: "Completion certificate",
            type: "Certificate",
            uploadedBy: "Oliver Reed",
            role: "Project Lead",
            timestamp: "10 Apr 2026, 09:35",
            status: "Reviewed",
          },
        ],
        timeline: [
          { id: "clad-t-1", label: "Available to release", detail: "Package is cleared for release control review.", timestamp: "10 Apr 2026" },
          { id: "clad-t-2", label: "Funding approved", detail: "All approvals completed for the release pack.", timestamp: "09 Apr 2026" },
        ],
      },
    ],
  },
  {
    id: "project-salford-quays",
    name: "Salford Quays Residential Plot A",
    location: "Manchester",
    totalValue: 3180000,
    fundingStatus: "At risk",
    fundingSummary: "£420k in bank account balance, £310k proof of funds pending, two contracts disputed.",
    dateRange: "Mar 2026 - Feb 2027",
    projectFilesSummary: "24 project files, 4 disputed evidence items, 5 open comments",
    actionCue: "Review disputed contracts",
    contracts: [
      {
        id: "contract-groundworks",
        title: "Groundworks and drainage",
        scopeSummary: "Drainage runs, attenuation tank install, and slab prep across the plot.",
        supplier: "Northwest Civils LLP",
        authority: "Commercial Director",
        startDate: "2026-03-14",
        endDate: "2026-06-09",
        value: 540000,
        progressPercent: 88,
        status: "Disputed",
        statusSummary: "The package is blocked because a disputed scope item is holding value in review.",
        fundingState: "Blocked",
        nextAction: "Request clarification on drainage variation",
        nextActionLabel: "Review contract",
        commentsPreview: "Supplier disputes omitted trench reinstatement; value held until clarification.",
        approvedValue: 260000,
        submittedBy: "George Millar",
        currentReviewer: "Commercial Director",
        nextApprover: "Commercial Director",
        checklist: [
          { id: "gw-1", label: "Groundworks measure agreed", done: true },
          { id: "gw-2", label: "Drainage as-built uploaded", done: true },
          { id: "gw-3", label: "Variation clarified", done: false },
        ],
        attachmentsSummary: ["Drainage as-built", "Variation note", "Inspection log"],
        filesSummary: { totalFiles: 7, certificates: 2, photos: 2, notes: 3 },
        approvalState: "Returned",
        evidence: [
          {
            id: "gw-e-1",
            group: "Certificates / PDFs",
            title: "Drainage inspection log",
            type: "PDF",
            uploadedBy: "George Millar",
            role: "Commercial Manager",
            timestamp: "08 Apr 2026, 15:40",
            status: "Reviewed",
          },
          {
            id: "gw-e-2",
            group: "Notes",
            title: "Variation clarification note",
            type: "Note",
            uploadedBy: "George Millar",
            role: "Commercial Manager",
            timestamp: "10 Apr 2026, 11:10",
            status: "Submitted",
          },
        ],
        timeline: [
          { id: "gw-t-1", label: "Dispute opened", detail: "Value held pending clarification on omitted works.", timestamp: "10 Apr 2026" },
          { id: "gw-t-2", label: "Evidence returned", detail: "Commercial review requested amendment.", timestamp: "08 Apr 2026" },
        ],
      },
    ],
  },
  {
    id: "project-birmingham-yard",
    name: "Birmingham Rail Service Yard",
    location: "Birmingham",
    totalValue: 1920000,
    fundingStatus: "Proof of funds pending",
    fundingSummary: "£190k in bank account balance, proof of funds being refreshed before next release.",
    dateRange: "May 2026 - Nov 2026",
    projectFilesSummary: "11 project files, 2 contract drafts, 1 evidence pack incoming",
    actionCue: "Add first live contract",
    contracts: [
      {
        id: "contract-prelims",
        title: "Site preliminaries",
        scopeSummary: "Welfare, access control, temporary power, fencing, and startup attendance.",
        supplier: "Midlands Site Services",
        authority: "Project Director",
        startDate: "2026-05-06",
        endDate: "2026-06-20",
        value: 180000,
        progressPercent: 12,
        status: "Sent",
        statusSummary: "The contract pack has been issued and now needs a commercial review before it can progress.",
        fundingState: "Proof of funds pending",
        nextAction: "Review submitted contract pack",
        nextActionLabel: "Review contract",
        commentsPreview: "Supplier pack sent for review; no release action yet.",
        approvedValue: 0,
        submittedBy: "Midlands Site Services",
        currentReviewer: "Commercial Manager",
        nextApprover: "Commercial Manager",
        checklist: [
          { id: "pre-1", label: "Draft issued", done: true },
          { id: "pre-2", label: "Supplier acceptance", done: false },
        ],
        attachmentsSummary: ["Draft subcontract", "Scope summary"],
        filesSummary: { totalFiles: 2, certificates: 0, photos: 0, notes: 2 },
        approvalState: "Pending",
        evidence: [],
        timeline: [
          { id: "pre-t-1", label: "Contract sent", detail: "Supplier review pack issued.", timestamp: "10 Apr 2026" },
        ],
      },
    ],
  },
];
