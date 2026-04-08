export type UIControlMode = "active" | "disabled" | "hidden";

export interface UIControlState {
  mode: UIControlMode;
  reason?: string;
}

export const uiControlChecklist = {
  projectSelector: {
    id: "project_selector",
    label: "My projects selector",
  },
  roleSelector: {
    id: "role_selector",
    label: "Acting as selector",
  },
  settingsEntry: {
    id: "settings_entry",
    label: "Prototype settings entry",
  },
  requestPrimaryAction: {
    id: "request_primary_action",
    label: "Primary request action",
  },
  requestSecondaryAction: {
    id: "request_secondary_action",
    label: "Secondary request action",
  },
  requestDetailReveal: {
    id: "request_detail_reveal",
    label: "Request detail reveal",
  },
  addSupportingInformation: {
    id: "add_supporting_information",
    label: "Add supporting information form",
  },
  reviewSupportingInformation: {
    id: "review_supporting_information",
    label: "Supporting information review controls",
  },
  addFundsForm: {
    id: "add_funds_form",
    label: "Add funds form",
  },
} as const;

export function activeControl(reason?: string): UIControlState {
  return { mode: "active", reason };
}

export function disabledControl(reason: string): UIControlState {
  return { mode: "disabled", reason };
}

export function hiddenControl(reason?: string): UIControlState {
  return { mode: "hidden", reason };
}

export function isControlActive(state: UIControlState) {
  return state.mode === "active";
}

export function shouldShowControl(state: UIControlState) {
  return state.mode !== "hidden";
}
