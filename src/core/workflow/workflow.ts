export type WorkflowState =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "disputed"
  | "approved_for_release"
  | "paid";

export function canTransition(
  from: WorkflowState,
  to: WorkflowState
): boolean {
  const transitions: Record<WorkflowState, WorkflowState[]> = {
    draft: ["submitted"],
    submitted: ["under_review"],
    under_review: ["approved", "partially_approved", "disputed"],
    approved: ["approved_for_release"],
    partially_approved: ["approved_for_release", "disputed"],
    disputed: [],
    approved_for_release: ["paid"],
    paid: [],
  };

  return transitions[from].includes(to);
}