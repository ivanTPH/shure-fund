import { ContractNode, getReleasableValue, hasDispute } from "../../core/contracts/contracts";
import { ContractLedger, canRelease, getAvailableToRelease } from "../../core/ledger/ledger";
import { WorkflowState } from "../../core/workflow/workflow";

export type FundingCheckResult = {
  eligible: boolean;
  reason:
    | "ok"
    | "disputed_contract"
    | "invalid_workflow_state"
    | "amount_exceeds_contract_releasable"
    | "amount_exceeds_ledger_available";
  availableToRelease: number;
};

const releasableStates: WorkflowState[] = ["approved_for_release", "paid"];

export function canFundRelease(
  contract: ContractNode,
  ledger: ContractLedger,
  amount: number
): boolean {
  if (hasDispute(contract)) return false;
  if (amount > getReleasableValue(contract)) return false;
  return canRelease(ledger, amount);
}

export function validateFundingRelease(
  contract: ContractNode,
  ledger: ContractLedger,
  amount: number,
  workflowState: WorkflowState
): FundingCheckResult {
  const availableToRelease = Math.max(
    0,
    Math.min(getReleasableValue(contract), getAvailableToRelease(ledger))
  );

  if (hasDispute(contract)) {
    return {
      eligible: false,
      reason: "disputed_contract",
      availableToRelease,
    };
  }

  if (!releasableStates.includes(workflowState)) {
    return {
      eligible: false,
      reason: "invalid_workflow_state",
      availableToRelease,
    };
  }

  if (amount > getReleasableValue(contract)) {
    return {
      eligible: false,
      reason: "amount_exceeds_contract_releasable",
      availableToRelease,
    };
  }

  if (amount > getAvailableToRelease(ledger)) {
    return {
      eligible: false,
      reason: "amount_exceeds_ledger_available",
      availableToRelease,
    };
  }

  return {
    eligible: true,
    reason: "ok",
    availableToRelease,
  };
}