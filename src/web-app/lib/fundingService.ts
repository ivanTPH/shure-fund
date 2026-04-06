type FundingReleaseContract = {
  disputedValue: number;
  approvedValue: number;
};

type FundingReleaseLedger = {
  releasedAmount: number;
};

export function validateFundingRelease(contract: FundingReleaseContract, ledger: FundingReleaseLedger): boolean {
  if (contract.disputedValue > 0) return false;
  if (ledger.releasedAmount > contract.approvedValue) return false;
  return true;
}
