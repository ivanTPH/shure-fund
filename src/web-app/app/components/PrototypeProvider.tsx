"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { Contact } from "@/lib/contactIdentity";
import { prototypeProjects, type ContractRecord, type ContractStatus, type ProjectRecord } from "@/lib/prototypeData";
import { actionFeedItems, hydrateReleaseFields, type ActionFeedItem } from "@/lib/actionFeedData";
import { defaultDemoUserId, demoUsers, filterActionsForDemoUser, filterProjectsForDemoUser, getDemoUser, type DemoUser } from "@/lib/demoUsers";
import ContactIdentityPanel from "./prototype/ContactIdentityPanel";

type AddContractInput = {
  projectId: string;
  contract: Omit<
    ContractRecord,
    | "id"
    | "progressPercent"
    | "status"
    | "statusSummary"
    | "fundingState"
    | "nextAction"
    | "nextActionLabel"
    | "commentsPreview"
    | "approvedValue"
    | "submittedBy"
    | "currentReviewer"
    | "nextApprover"
    | "checklist"
    | "filesSummary"
    | "approvalState"
    | "evidence"
    | "timeline"
  > & {
    attachmentsSummary: string[];
  };
};

type PrototypeContextValue = {
  projects: ProjectRecord[];
  actionFeedItems: ActionFeedItem[];
  currentUser: DemoUser;
  setCurrentUserId: (userId: string) => void;
  createProject: (input: ProjectCreateInput) => string;
  issueContract: (input: ContractCreateInput) => { contractId: string; status: ContractStatus; fundingShortfall: boolean };
  assignContractSupplier: (input: { projectId: string; contractId: string; contactId: string; invite?: boolean }) => string;
  runContractAction: (input: { projectId: string; contractId: string; actionKey: string; note?: string }) => string;
  runProjectFundingAction: (input: { projectId: string; actionKey: string; contractId?: string }) => string;
  addContract: (input: AddContractInput) => string;
  getProject: (projectId: string) => ProjectRecord | undefined;
  getContract: (projectId: string, contractId: string) => ContractRecord | undefined;
};

export type ContractCreateInput = {
  projectId: string;
  parentContractId?: string;
  title: string;
  packageType: string;
  description?: string;
  postcode?: string;
  what3words?: string;
  startDate?: string;
  endDate?: string;
  value: number;
  authorityName?: string;
  assignedRole?: string;
  signOffAuthority?: boolean;
  paymentAuthority?: boolean;
  attachmentsSummary?: string[];
  mode: "draft" | "issue";
};

export type ProjectCreateInput = {
  name: string;
  description?: string;
  location: string;
  postcode?: string;
  what3words?: string;
  startDate?: string;
  endDate?: string;
  budgetValue?: number;
  initialFunding?: number;
  authorityName?: string;
  paymentAuthorityName?: string;
  signOffAuthority?: boolean;
  paymentAuthority?: boolean;
  attachmentsSummary?: string[];
};

type ContactIdentityPanelContextValue = {
  openContactPanel: (contact: Contact) => void;
  closeContactPanel: () => void;
};

const PrototypeContext = createContext<PrototypeContextValue | null>(null);
const ContactIdentityPanelContext = createContext<ContactIdentityPanelContextValue | null>(null);

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) {
    throw new Error("usePrototype must be used within PrototypeProvider");
  }
  return context;
}

export function useContactIdentityPanel() {
  const context = useContext(ContactIdentityPanelContext);
  if (!context) {
    throw new Error("useContactIdentityPanel must be used within PrototypeProvider");
  }
  return context;
}

export default function PrototypeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = useState<ProjectRecord[]>(prototypeProjects);
  const [currentUserId, setCurrentUserId] = useState(defaultDemoUserId);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const currentUser = getDemoUser(currentUserId);

  const value = useMemo<PrototypeContextValue>(
    () => ({
      projects: filterProjectsForDemoUser(projects, currentUser),
      actionFeedItems: filterActionsForDemoUser(actionFeedItems.map(hydrateReleaseFields), currentUser),
      currentUser,
      setCurrentUserId,
      createProject: ({
        name,
        description,
        location,
        postcode,
        what3words,
        startDate,
        endDate,
        budgetValue,
        initialFunding,
        authorityName,
        paymentAuthorityName,
        signOffAuthority,
        paymentAuthority,
        attachmentsSummary,
      }) => {
        const nextId = `project-${Date.now()}`;
        const funding = initialFunding ?? 0;
        const budget = budgetValue ?? funding;
        setProjects((current) => [
          {
            id: nextId,
            name: name.trim() || "New project",
            description: description?.trim() || "Project description pending.",
            location: location.trim() || "Location pending",
            postcode: postcode?.trim() || undefined,
            what3words: what3words?.trim() || undefined,
            budgetValue: budget,
            attachmentsSummary: attachmentsSummary?.filter(Boolean) ?? [],
            permissions: {
              signOffAuthority: Boolean(signOffAuthority),
              paymentAuthority: Boolean(paymentAuthority),
              authorityName: authorityName?.trim() || currentUser.name,
              paymentAuthorityName: paymentAuthorityName?.trim() || currentUser.name,
            },
            totalValue: budget,
            fundingStatus: funding > 0 ? "Funded" : "Proof of funds pending",
            fundingSummary: funding > 0 ? `${currency(funding)} initial funding recorded.` : "Initial funding to be added.",
            dateRange: startDate || endDate ? `${startDate || "Start pending"} - ${endDate || "End pending"}` : "Draft programme",
            projectFilesSummary: attachmentsSummary?.length ? `${attachmentsSummary.length} project files attached` : "No project files yet",
            actionCue: "Issue first contract",
            contracts: [],
          },
          ...current,
        ]);
        return nextId;
      },
      issueContract: ({
        projectId,
        parentContractId,
        title,
        packageType,
        description,
        postcode,
        what3words,
        startDate,
        endDate,
        value,
        authorityName,
        assignedRole,
        signOffAuthority,
        paymentAuthority,
        attachmentsSummary,
        mode,
      }) => {
        const nextId = `contract-${Date.now()}`;
        let nextStatus: ContractStatus = "Draft";
        let fundingShortfall = false;
        setProjects((current) =>
          current.map((project) => {
            if (project.id !== projectId) return project;
            const availableFunding = inferAvailableProjectFunding(project);
            fundingShortfall = value > availableFunding;
            nextStatus = mode === "issue" && !fundingShortfall ? "Issued" : "Draft";
            const fundingState = fundingShortfall ? "Proof of funds pending" : "Banked";
            const parentContract = parentContractId ? project.contracts.find((contract) => contract.id === parentContractId) : undefined;
            const statusSummary = nextStatus === "Issued"
              ? "Contract issued from the summary flow and awaiting supplier invitation or acceptance."
              : fundingShortfall
                ? "Saved as draft because available ringfenced funding does not cover the contract value."
                : "Saved as draft and ready for supplier assignment or issue.";
            const fileNames = attachmentsSummary?.filter(Boolean) ?? [];

            return {
                  ...project,
                  totalValue: project.totalValue + value,
                  fundingStatus: fundingShortfall ? "At risk" : project.fundingStatus,
                  fundingSummary: fundingShortfall ? `Funding shortfall: ${currency(Math.max(0, value - availableFunding))} needed before this contract can become active.` : project.fundingSummary,
                  contracts: [
                    {
                      id: nextId,
                      title: title.trim() || "New contract package",
                      packageType: packageType || "Package",
                      scopeSummary: description?.trim() || `${packageType || "Package"}${parentContract ? ` subcontract under ${parentContract.title}` : " issued from project summary"}.`,
                      supplier: "Supplier pending",
                      supplierStatus: "Unassigned",
                      authority: authorityName?.trim() || currentUser.name,
                      authorityContactId: currentUser.id,
                      parentProjectId: project.id,
                      parentContractId,
                      postcode: postcode?.trim() || undefined,
                      what3words: what3words?.trim() || undefined,
                      permissions: {
                        signOffAuthority: Boolean(signOffAuthority),
                        paymentAuthority: Boolean(paymentAuthority),
                        authorityName: authorityName?.trim() || currentUser.name,
                      },
                      startDate: startDate || "Start pending",
                      endDate: endDate || "Draft programme",
                      value,
                      progressPercent: 0,
                      status: nextStatus,
                      statusSummary,
                      fundingState,
                      nextAction: nextStatus === "Issued" ? "Recipient acceptance required" : fundingShortfall ? "Resolve funding shortfall" : "Issue contract",
                      nextActionLabel: nextStatus === "Issued" ? "Review contract" : fundingShortfall ? "View funds" : "Review contract",
                      commentsPreview: "No comments yet.",
                      approvedValue: 0,
                      submittedBy: currentUser.name,
                      currentReviewer: assignedRole?.trim() || "Recipient",
                      nextApprover: "Project owner",
                      checklist: [
                        { id: `${nextId}-scope`, label: "Scope issued", done: nextStatus === "Issued" },
                        { id: `${nextId}-funding`, label: "Funding cover checked", done: !fundingShortfall },
                        { id: `${nextId}-supplier`, label: "Supplier invited", done: false },
                        { id: `${nextId}-evidence`, label: "Opening evidence uploaded", done: false },
                      ],
                      attachmentsSummary: fileNames,
                      filesSummary: { totalFiles: fileNames.length, certificates: fileNames.filter((file) => /\.pdf$/i.test(file)).length, photos: 0, notes: fileNames.length },
                      approvalState: "Pending",
                      evidence: [],
                      timeline: [{
                        id: `${nextId}-created`,
                        label: parentContract ? "Subcontract draft created" : nextStatus === "Issued" ? "Contract issued" : "Draft saved",
                        detail: statusSummary,
                        timestamp: "Today",
                      }],
                    },
                    ...project.contracts,
                  ],
                };
          }),
        );
        return { contractId: nextId, status: nextStatus, fundingShortfall };
      },
      assignContractSupplier: ({ projectId, contractId, contactId, invite }) => {
        const contact = demoUsers.find((user) => user.id === contactId);
        let confirmation = "Supplier assignment updated.";
        if (!contact) return "Select a supplier or subcontractor first.";
        setProjects((current) =>
          current.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              contracts: project.contracts.map((contract) => {
                if (contract.id !== contractId) return contract;
                const supplierStatus = invite ? "Invited" : "Unassigned";
                confirmation = invite ? `Invite sent to ${contact.company}.` : `${contact.company} assigned.`;
                return {
                  ...contract,
                  supplier: contact.company,
                  supplierContactId: contact.id,
                  supplierStatus,
                  status: invite && contract.status === "Draft" && contract.fundingState !== "Proof of funds pending" && contract.fundingState !== "Blocked" ? "Issued" : contract.status,
                  statusSummary: invite
                    ? `Supplier invitation sent to ${contact.name} at ${contact.company}.`
                    : `${contact.company} selected as delivery party. Invite when the contract pack is ready.`,
                  nextAction: invite ? "Recipient acceptance required" : "Invite supplier",
                  checklist: contract.checklist.map((item) => /supplier/i.test(item.label) ? { ...item, done: Boolean(invite) } : item),
                  timeline: [
                    { id: `${contract.id}-supplier-${Date.now()}`, label: invite ? "Supplier invited" : "Supplier assigned", detail: confirmation, timestamp: "Today" },
                    ...contract.timeline,
                  ],
                };
              }),
            };
          }),
        );
        return confirmation;
      },
      runContractAction: ({ projectId, contractId, actionKey, note }) => {
        let confirmation = "Action completed.";
        setProjects((current) =>
          current.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              contracts: project.contracts.map((contract) => {
                if (contract.id !== contractId) return contract;
                const result = transitionContract(contract, actionKey, currentUser, note);
                confirmation = result.confirmation;
                return result.contract;
              }),
            };
          }),
        );
        return confirmation;
      },
      runProjectFundingAction: ({ projectId, actionKey, contractId }) => {
        let confirmation = "Funding action completed.";
        setProjects((current) =>
          current.map((project) => {
            if (project.id !== projectId) return project;
            const targetContractId = contractId ?? project.contracts.find((contract) => contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked")?.id;
            if (actionKey === "add_funding") {
              confirmation = "Project reserve topped up.";
              return {
                ...project,
                fundingStatus: "Funded",
                fundingSummary: `${currency(inferAvailableProjectFunding(project) + 250000)} available headroom after funding top-up.`,
              };
            }
            if (actionKey === "request_funds") {
              confirmation = "Funding request sent to project owner.";
              return {
                ...project,
                fundingSummary: `${project.fundingSummary} Funding request logged today.`,
              };
            }
            if (actionKey === "transfer_funds" || actionKey === "commit_funds") {
              confirmation = "Funds committed to contract.";
              return {
                ...project,
                fundingStatus: "Funded",
                fundingSummary: `${currency(Math.max(0, inferAvailableProjectFunding(project) - 100000))} available headroom after contract commitment.`,
                contracts: project.contracts.map((contract) =>
                  contract.id === targetContractId
                    ? {
                        ...contract,
                        fundingState: "Available to release",
                        statusSummary: "Funds committed from project reserve. Contract may proceed when other gates are clear.",
                        nextAction: contract.approvalState === "Approved" ? "Confirm release" : "Review approval status",
                        timeline: [
                          { id: `${contract.id}-${actionKey}-${Date.now()}`, label: actionKey === "transfer_funds" ? "Funds transferred" : "Funds committed", detail: "Project reserve assigned to contract commitment.", timestamp: "Today" },
                          ...contract.timeline,
                        ],
                      }
                    : contract,
                ),
              };
            }
            return project;
          }),
        );
        return confirmation;
      },
      addContract: ({ projectId, contract }) => {
        const nextId = `contract-${Date.now()}`;
        setProjects((current) =>
          current.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  contracts: [
                    {
                      id: nextId,
                      progressPercent: 0,
                      status: "Draft",
                      statusSummary: "The contract has been created locally and now needs its first review step.",
                      fundingState: "Proof of funds pending",
                      nextAction: "Upload opening evidence",
                      nextActionLabel: "Upload evidence",
                      commentsPreview: "No comments yet.",
                      approvedValue: 0,
                      submittedBy: contract.supplier || "Supplier pending",
                      currentReviewer: "Commercial Manager",
                      nextApprover: "Commercial Manager",
                      checklist: [
                        { id: `${nextId}-c1`, label: "Contract summary reviewed", done: false },
                        { id: `${nextId}-c2`, label: "Opening evidence uploaded", done: false },
                        { id: `${nextId}-c3`, label: "Sign-off requested", done: false },
                      ],
                      filesSummary: {
                        totalFiles: contract.attachmentsSummary.length,
                        certificates: 0,
                        photos: 0,
                        notes: contract.attachmentsSummary.length,
                      },
                      approvalState: "Pending",
                      evidence: [],
                      timeline: [{ id: `${nextId}-t1`, label: "Draft created", detail: "Prototype contract created from the add contract flow.", timestamp: "Today" }],
                      ...contract,
                    },
                    ...project.contracts,
                  ],
                }
              : project,
          ),
        );
        return nextId;
      },
      getProject: (projectId) => projects.find((project) => project.id === projectId),
      getContract: (projectId, contractId) => projects.find((project) => project.id === projectId)?.contracts.find((contract) => contract.id === contractId),
    }),
    [currentUser, projects],
  );

  const contactPanelValue = useMemo<ContactIdentityPanelContextValue>(
    () => ({
      openContactPanel: (contact) => setSelectedContact(contact),
      closeContactPanel: () => setSelectedContact(null),
    }),
    [],
  );

  return (
    <PrototypeContext.Provider value={value}>
      <ContactIdentityPanelContext.Provider value={contactPanelValue}>
        {children}
        <ContactIdentityPanel contact={selectedContact} onClose={() => setSelectedContact(null)} />
      </ContactIdentityPanelContext.Provider>
    </PrototypeContext.Provider>
  );
}

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function inferAvailableProjectFunding(project: ProjectRecord) {
  const availableMatch = project.fundingSummary.match(/£([\d.]+)\s*([mk])?\s+available/i);
  if (availableMatch) return parseAmount(availableMatch[1], availableMatch[2]);
  const balanceMatch = project.fundingSummary.match(/£([\d.]+)\s*([mk])?\s+in bank/i);
  if (balanceMatch) return parseAmount(balanceMatch[1], balanceMatch[2]);
  if (project.fundingStatus === "Funded") return Math.max(project.totalValue, 0);
  return 0;
}

function parseAmount(raw: string, unit?: string) {
  const amount = Number(raw) || 0;
  if (unit?.toLowerCase() === "m") return Math.round(amount * 1_000_000);
  if (unit?.toLowerCase() === "k") return Math.round(amount * 1_000);
  return amount;
}

function transitionContract(contract: ContractRecord, actionKey: string, user: DemoUser, note?: string) {
  const now = "Today";
  const auditText = note || `${labelForAction(actionKey)} completed by ${user.name}.`;
  let next: ContractRecord = {
    ...contract,
    timeline: [
      { id: `${contract.id}-${actionKey}-${Date.now()}`, label: labelForAction(actionKey), detail: auditText, timestamp: now },
      ...contract.timeline,
    ],
  };
  let confirmation = `${labelForAction(actionKey)} completed.`;

  switch (actionKey) {
    case "issue_contract":
      next = {
        ...next,
        status: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked" ? "Draft" : "Issued",
        nextAction: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked" ? "Resolve funding shortfall" : "Recipient acceptance required",
        statusSummary: contract.fundingState === "Proof of funds pending" || contract.fundingState === "Blocked"
          ? "Funding shortfall blocks issue; draft remains pending funding."
          : "Contract issued to recipient and awaiting acceptance.",
      };
      confirmation = next.status === "Issued" ? "Contract issued." : "Funding shortfall: draft saved pending funding.";
      break;
    case "save_draft":
    case "edit":
      next = { ...next, status: "Draft", statusSummary: "Draft updated and ready for issue when gates are clear.", nextAction: "Issue contract" };
      confirmation = "Draft saved.";
      break;
    case "accept_contract":
      next = { ...next, status: "Accepted", statusSummary: "Recipient accepted the contract. Reassignment is now locked.", nextAction: "Activate contract" };
      confirmation = "Contract accepted; reassignment locked.";
      break;
    case "activate_contract":
      next = { ...next, status: "Active", statusSummary: "Contract is active and can receive evidence, approvals, variations, and disputes.", nextAction: "Submit evidence" };
      confirmation = "Contract activated.";
      break;
    case "return":
    case "return_contract":
      next = { ...next, status: "Returned", approvalState: "Returned", statusSummary: "Returned for edits before reissue.", nextAction: "Edit and reissue" };
      confirmation = "Contract returned.";
      break;
    case "reject_contract":
      next = { ...next, status: "Rejected", statusSummary: "Recipient rejected this contract. It can be cancelled or duplicated as a new draft.", nextAction: "Cancel or duplicate draft" };
      confirmation = "Contract rejected.";
      break;
    case "duplicate_draft":
      next = { ...next, status: "Draft", statusSummary: "Duplicated as a fresh draft for amendment.", nextAction: "Edit draft" };
      confirmation = "Duplicated as draft.";
      break;
    case "cancel":
    case "cancel_contract":
      next = { ...next, status: "Cancelled", statusSummary: "Contract cancelled in demo workflow.", nextAction: "No action" };
      confirmation = "Contract cancelled.";
      break;
    case "approve":
      next = { ...next, approvalState: "Approved", approvedValue: Math.max(contract.approvedValue, contract.value), statusSummary: "Approval completed; release gate can be assessed.", nextAction: "Confirm release" };
      confirmation = "Approval completed.";
      break;
    case "review_funding":
    case "add_funding":
    case "commit_funds":
    case "transfer_funds":
      next = { ...next, fundingState: "Available to release", statusSummary: "Funding cover added and release gate refreshed.", nextAction: contract.approvalState === "Approved" ? "Confirm release" : "Approve contract" };
      confirmation = actionKey === "commit_funds" ? "Funds committed to contract." : actionKey === "transfer_funds" ? "Funds transferred to commitment." : "Funding resolved.";
      break;
    case "request_funds":
      next = { ...next, statusSummary: "Funding request sent to project reserve owner.", nextAction: "Funding request pending", commentsPreview: "Contract owner requested funding commitment." };
      confirmation = "Funding request sent.";
      break;
    case "upload_evidence":
    case "submit_evidence":
    case "request_evidence":
      next = appendEvidence(next, user, "Opening evidence uploaded");
      confirmation = "Evidence submitted.";
      break;
    case "resubmit_evidence":
      next = appendEvidence({ ...next, approvalState: "Pending", status: "Active", nextAction: "Review resubmitted evidence" }, user, "Returned evidence resubmitted");
      confirmation = "Evidence resubmitted.";
      break;
    case "confirm_release":
    case "release_payment":
      next = { ...next, status: "Completed", fundingState: "Released", progressPercent: 100, approvedValue: Math.max(contract.approvedValue, contract.value), statusSummary: "Approved funded value released. Contract is complete and read-only except audit/files.", nextAction: "No action" };
      confirmation = "Payment released.";
      break;
    case "reassign":
      if (["Accepted", "Active", "Completed"].includes(contract.status)) {
        confirmation = "Reassign unavailable after acceptance.";
      } else {
        next = { ...next, currentReviewer: user.name, statusSummary: "Contract reassigned before acceptance.", nextAction: "Recipient acceptance required" };
        confirmation = "Contract reassigned.";
      }
      break;
    case "clarify":
      next = { ...next, commentsPreview: "Clarification note added in demo workflow." };
      confirmation = "Clarification opened.";
      break;
    case "escalate":
      next = { ...next, commentsPreview: "Escalated to project authority in demo workflow." };
      confirmation = "Escalation recorded.";
      break;
    case "record_resolution":
    case "respond_dispute":
      next = { ...next, status: "Active", fundingState: "Available to release", statusSummary: "Dispute response recorded; undisputed value can continue through gates.", nextAction: "Review approval status" };
      confirmation = "Dispute response recorded.";
      break;
    default:
      confirmation = `${labelForAction(actionKey)} opened.`;
  }

  return { contract: next, confirmation };
}

function appendEvidence(contract: ContractRecord, user: DemoUser, title: string): ContractRecord {
  const evidenceId = `${contract.id}-evidence-${Date.now()}`;
  return {
    ...contract,
    status: contract.status === "Draft" || contract.status === "Issued" ? "Active" : contract.status,
    statusSummary: "Evidence submitted and ready for reviewer action.",
    nextAction: "Review submitted evidence",
    filesSummary: {
      ...contract.filesSummary,
      totalFiles: contract.filesSummary.totalFiles + 1,
      notes: contract.filesSummary.notes + 1,
    },
    evidence: [
      {
        id: evidenceId,
        group: "Notes",
        title,
        type: "Note",
        uploadedBy: user.name,
        role: user.roleLabel,
        timestamp: "Today",
        status: "Submitted",
      },
      ...contract.evidence,
    ],
    checklist: contract.checklist.map((item) => /evidence/i.test(item.label) ? { ...item, done: true } : item),
  };
}

function labelForAction(actionKey: string) {
  return actionKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
