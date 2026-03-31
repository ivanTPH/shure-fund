export type ActionType =
  | "funding"
  | "dispute"
  | "variation"
  | "evidence"
  | "approval"
  | "audit"
  | "completion"
  | "readiness";

type ActionIconType = ActionType | "blocked" | "warning" | "info";

export interface ActionTypeConfig {
  label: string;
  icon: ActionIconType;
  description: string;
  ctaLabel: string;
}

export const actionTypeConfig: Record<ActionType, ActionTypeConfig> = {
  funding: {
    label: "Funding",
    icon: "funding",
    description: "Review and resolve funding issues.",
    ctaLabel: "Review Funding",
  },
  dispute: {
    label: "Dispute",
    icon: "dispute",
    description: "Review and resolve disputes.",
    ctaLabel: "Review Dispute",
  },
  variation: {
    label: "Variation",
    icon: "variation",
    description: "Review and approve variations.",
    ctaLabel: "Review Variation",
  },
  evidence: {
    label: "Evidence",
    icon: "evidence",
    description: "Review submitted evidence and documents.",
    ctaLabel: "Review Evidence",
  },
  approval: {
    label: "Approval",
    icon: "approval",
    description: "Review and approve items.",
    ctaLabel: "Review Approval",
  },
  audit: {
    label: "Audit",
    icon: "audit",
    description: "Review audit trail and history.",
    ctaLabel: "View Audit",
  },
  completion: {
    label: "Completion",
    icon: "completion",
    description: "Review completion status.",
    ctaLabel: "Review Completion",
  },
  readiness: {
    label: "Readiness",
    icon: "readiness",
    description: "Review readiness for next step.",
    ctaLabel: "Review Readiness",
  },
};

export type ActionTypeKey = ActionType;
