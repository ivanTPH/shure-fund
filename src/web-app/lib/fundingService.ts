export function validateFundingRelease(contract: any, ledger: any): boolean {
  if (contract.disputedValue > 0) return false;
  if (ledger.releasedAmount > contract.approvedValue) return false;
  return true;
}