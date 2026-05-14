export type VariationStatus =
  | "Awaiting review"
  | "Awaiting funding confirmation"
  | "Approved"
  | "Rejected";

export type VariationItem = {
  id: string;
  projectId: string;
  contractId: string;
  title: string;
  summary: string;
  valueImpact: number;
  timeImpact: string;
  status: VariationStatus;
  support: string;
  fundingCheckSummary: string;
};

export type DisputeItem = {
  id: string;
  projectId: string;
  contractId: string;
  disputedAmount: number;
  issueSummary: string;
  disputeReason: string;
  frozenState: string;
  supportingFilesSummary: string;
};

export const variationItems: VariationItem[] = [
  {
    id: "variation-roofing-cover",
    projectId: "project-brent-cross",
    contractId: "contract-roofing",
    title: "Additional roof edge protection",
    summary: "Additional edge protection and membrane overlap are required to complete the next certified zone safely.",
    valueImpact: 95000,
    timeImpact: "+7 days",
    status: "Awaiting funding confirmation",
    support: "Site instruction, marked-up roof zone drawing, and supplier note support the change.",
    fundingCheckSummary: "Funding cover is being checked before the variation can activate against the live contract value.",
  },
  {
    id: "variation-prelims-welfare",
    projectId: "project-birmingham-yard",
    contractId: "contract-prelims",
    title: "Extended welfare and temporary power",
    summary: "Extended site welfare, temporary power, and fencing are needed to support the revised rail possession window.",
    valueImpact: 28000,
    timeImpact: "+10 days",
    status: "Awaiting review",
    support: "Programme revision note and supplier commercial breakdown have been uploaded.",
    fundingCheckSummary: "Funding confirmation is not yet requested because the variation is still in first review.",
  },
  {
    id: "variation-steel-firecoat",
    projectId: "project-brent-cross",
    contractId: "contract-steel-frame",
    title: "Fire coating access revision",
    summary: "Access revision for fire coating has been accepted and rolled into the latest approved value.",
    valueImpact: 18000,
    timeImpact: "+2 days",
    status: "Approved",
    support: "Commercial review accepted the supplier breakdown and supporting site photographs.",
    fundingCheckSummary: "Approved variation is reflected in the live contract position.",
  },
];

export const disputeItems: DisputeItem[] = [
  {
    id: "dispute-groundworks-reinstatement",
    projectId: "project-salford-quays",
    contractId: "contract-groundworks",
    disputedAmount: 95000,
    issueSummary: "Trench reinstatement is disputed between the original scope and the supplier variation.",
    disputeReason: "The supplier states trench reinstatement was omitted from the instructed scope, while the employer team considers it included.",
    frozenState: "Only the affected value is frozen in dispute while the remaining certified work can continue through the project workflow.",
    supportingFilesSummary: "Variation note, drainage logs, site instructions, and email correspondence are linked to this dispute.",
  },
];

export function getVariationByContract(projectId: string, contractId: string) {
  return variationItems.find((item) => item.projectId === projectId && item.contractId === contractId);
}

export function getDisputeByContract(projectId: string, contractId: string) {
  return disputeItems.find((item) => item.projectId === projectId && item.contractId === contractId);
}
