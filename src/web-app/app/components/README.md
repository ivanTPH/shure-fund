# Shure.Fund Dashboard UI Components & Interaction Model

## Files Changed
- `app/page.tsx`: Main dashboard, now with operable UI, local state, and contextual modals/panels.
- `app/components/ActionModal.tsx`: Generic modal for action review.
- `app/components/StageReviewPanel.tsx`: Panel for reviewing stage details.
- `app/components/EvidenceReviewPanel.tsx`: Panel for reviewing evidence/documents.

## Components Added
- **ActionModal**: Reusable modal for reviewing any action (funding, dispute, variation, evidence, approval, etc).
- **StageReviewPanel**: Drawer/modal for reviewing a stage (details, status, future: audit, approvals, blockers, etc).
- **EvidenceReviewPanel**: Drawer/modal for reviewing evidence items, status, and document details.

## Interaction Model
- **Action Queue**: Each action now has a primary CTA button ("Review ...") that opens a contextual modal. Evidence/approval actions can trigger deeper review panels.
- **Release Decision Overview**: Each stage card has "View Details" and "Review Evidence" buttons. These open the relevant panels for that stage.
- **Panels/Modals**: All overlays are local state-driven, do not navigate away, and are role/context aware.
- **Role Filtering**: All actions and panels remain filtered by the selected role.
- **UI State**: Local state tracks selected action, stage, evidence, and which panel/modal is open.

## Assumptions
- All backend actions are currently UI-only (no API calls, no mutations).
- Evidence and approval review are based on mock/demo data.
- Stage review panel is a placeholder for future audit/approval flows.
- All overlays are accessible and keyboard-closeable.
- No redesign or style changes were made; all additions are modular and dark-theme friendly.
