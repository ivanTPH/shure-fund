# Contributing

## Branch Rules

- Do not commit feature work directly to `main`.
- Create a short-lived branch for every change.
- Recommended branch prefixes:
  - `feature/`
  - `fix/`
  - `chore/`
  - `docs/`

## Pull Request Rules

- Every PR must reference the relevant source-of-truth files in `/shure_fund_docs/`.
- Every PR must explain which documented rules were used.
- Every PR must state whether business logic changed in `src/web-app/lib/systemState.ts`.
- Every PR must include the result of:
  - `npm --prefix src/web-app run lint`
  - `npm --prefix src/web-app run build`

## Source Of Truth

- Treat `/shure_fund_docs/` as the mandatory source of truth.
- Minimum files to check when changing product behavior:
  - `ShureFund_SoT_v3.md`
  - `ShureFund_Control_Logic_v2_1.md`
  - `ShureFund_Data_Model_v2_1.md`
  - `ShureFund_Workflow_State_Machine_v1.md`
  - `ShureFund_Audit_and_Event_Model_v1.md`

## Logic Drift

- For the active Shure.Fund app path, keep business logic in `src/web-app/lib/systemState.ts`.
- Run `node scripts/check-logic-drift.mjs` before opening a PR.
- The drift check is warning-only, but warnings must be reviewed in the PR.
