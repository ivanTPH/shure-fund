export type ContractStatus =
  | "draft"
  | "funded"
  | "active"
  | "disputed"
  | "completed";

export type ContractNode = {
  contractId: string;
  parentContractId?: string;
  title: string;
  contractValue: number;
  approvedValue: number;
  disputedValue: number;
  status: ContractStatus;
};

export function getReleasableValue(node: ContractNode): number {
  return node.approvedValue;
}

export function hasDispute(node: ContractNode): boolean {
  return node.disputedValue > 0;
}