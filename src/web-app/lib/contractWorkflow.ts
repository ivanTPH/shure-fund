import type { ContractRecord, EvidenceGroup, ProjectRecord } from "./prototypeData";
import { getApprovalReleaseRecord } from "./approvalReleaseData";

export type ContractWorkflowState =
  | "evidence_required"
  | "ready_for_signoff"
  | "awaiting_approval"
  | "available_to_release"
  | "review_contract";

export function getContractWorkflowState(contract: ContractRecord): ContractWorkflowState {
  switch (contract.nextActionLabel) {
    case "Upload evidence":
      return "evidence_required";
    case "Request sign-off":
      return "ready_for_signoff";
    case "View approval status":
      return "awaiting_approval";
    case "View funds":
      return "available_to_release";
    default:
      return "review_contract";
  }
}

export function getContractPrimaryHref(project: ProjectRecord, contract: ContractRecord) {
  const workflowState = getContractWorkflowState(contract);
  const releaseRecord = getApprovalReleaseRecord(contract.id);

  if (workflowState === "evidence_required") {
    return `/projects/${project.id}/contracts/${contract.id}/evidence/upload`;
  }

  if (workflowState === "ready_for_signoff") {
    return `/projects/${project.id}/contracts/${contract.id}/approval-chain`;
  }

  if (workflowState === "awaiting_approval") {
    return `/projects/${project.id}/contracts/${contract.id}/approval-chain`;
  }

  if (workflowState === "available_to_release") {
    return `/projects/${project.id}/contracts/${contract.id}/release`;
  }

  if (releaseRecord && releaseRecord.heldAmount > 0 && releaseRecord.approvalStage === "treasury") {
    return `/projects/${project.id}/contracts/${contract.id}/release`;
  }

  return `/projects/${project.id}/contracts/${contract.id}`;
}

export function getEvidenceGroups(contract: ContractRecord): Array<{
  group: EvidenceGroup;
  items: ContractRecord["evidence"];
}> {
  const orderedGroups: EvidenceGroup[] = ["Photos", "Certificates / PDFs", "Notes", "Drawings"];
  return orderedGroups.map((group) => ({
    group,
    items: contract.evidence.filter((item) => item.group === group),
  }));
}

export function getChecklistReadiness(contract: ContractRecord) {
  const submitted = contract.checklist.filter((item) => item.done);
  const missing = contract.checklist.filter((item) => !item.done);
  return {
    submitted,
    missing,
    ready: missing.length === 0,
  };
}
