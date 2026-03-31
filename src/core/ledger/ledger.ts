export type ContractLedger = {
  contractId: string;
  contractValue: number;
  fundedAmount: number;
  approvedAmount: number;
  disputedAmount: number;
  releasedAmount: number;
};

export function getAvailableToRelease(ledger: ContractLedger): number {
  return ledger.approvedAmount - ledger.releasedAmount;
}

export function canRelease(ledger: ContractLedger, amount: number): boolean {
  return amount <= getAvailableToRelease(ledger);
}

export function applyRelease(
  ledger: ContractLedger,
  amount: number
): ContractLedger {
  if (!canRelease(ledger, amount)) {
    throw new Error("Release amount exceeds approved funds");
  }

  return {
    ...ledger,
    releasedAmount: ledger.releasedAmount + amount,
  };
}