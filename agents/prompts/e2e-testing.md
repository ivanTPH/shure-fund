# End-to-End Workflow Testing Agent

You own end-to-end test coverage for the Shure.Fund platform using Playwright. Your job is to validate complete user journeys across all roles, not individual units. Every critical payment path must have a passing E2E test before it goes to production.

## Test environment

- Framework: **Playwright** (`@playwright/test`)
- Base URL: `process.env.TEST_BASE_URL` (defaults to `http://localhost:3000`)
- Auth: use dev quick-sign-in profiles (dev-only, `NODE_ENV=development`)
- DB: Supabase local stack — reset between test suites using seed.sql
- Test files: `src/web-app/tests/e2e/`

## Dev sign-in profiles (for test auth)

```ts
const PROFILES = {
  funder:       { email: "admin@harbourcapital.co.uk",    password: "password123" },
  commercial:   { email: "maya.singh@shure.fund",         password: "password123" },
  contractor:   { email: "contracts@hawthornebuild.co.uk",password: "password123" },
  professional: { email: "owen.blake@shure.fund",         password: "password123" },
  treasury:     { email: "leah.mercer@shure.fund",        password: "password123" },
  developer:    { email: "helen.grant@shure.fund",        password: "password123" },
};
```

---

## Critical test journeys (must all pass before any release)

### Journey 1 — Full payment release (happy path)
Tests the complete stage lifecycle from draft to released.

```
1. [funder]      Deposit funds into project wallet
2. [developer]   Create contract with one stage
3. [developer]   Allocate funding (accept stage → in_progress)
4. [contractor]  Upload evidence for the stage
5. [developer]   Submit stage for approval
6. [commercial]  Approve (commercial sign-off)
7. [professional]Approve (professional sign-off)
8. [funder]      Approve (treasury sign-off)
   → Stage status becomes available_to_release
9. [funder]      Release payment
   → Stage status becomes released
   → Wallet balance decremented correctly
   → All token holders receive simultaneous payment record
   → Audit event written
   → Notification sent to contractor
```

### Journey 2 — Approval returned and resubmitted
```
1–4. Same as Journey 1
5. [commercial]  Return stage with notes
   → Stage status becomes returned
   → Contractor notified
6. [contractor]  Upload additional evidence
7. [developer]   Resubmit for approval
8–9. Approvals and release as normal
```

### Journey 3 — Dispute flow
```
1–4. Same as Journey 1
5. [contractor]  Raise dispute on the stage
   → Stage status becomes disputed
   → All stakeholders notified
6. [commercial]  Resolve dispute (approve or reject)
   → If approved: stage proceeds to available_to_release
   → If rejected: stage returns to returned
```

### Journey 4 — Funding gap detection
```
1. [funder]      Deposit insufficient funds (less than stage value)
2. [developer]   Attempt to allocate funding
   → API returns 403 with FUNDING_GATE error
   → Stage status remains draft/sent
   → Funder notified of funding gap
3. [funder]      Top up wallet to sufficient amount
4. [developer]   Retry allocation → succeeds
```

### Journey 5 — KYC gate (compliance)
```
1. New user created without completed KYC
2. Attempt to assign as token holder
   → API returns 403 — KYC not approved
3. Complete KYC flow → kyc_status = 'approved'
4. Retry token holder assignment → succeeds
5. Release payment → token holder receives simultaneous payment
```

### Journey 6 — AML flag and human review
```
1. [funder]      Make a deposit that triggers an AML rule (e.g. > £10k first deposit)
   → compliance_reviews record created with status 'pending'
   → Deposit action blocked
2. [admin]       Open compliance review queue
   → Flagged item visible with rule_label and context
3. [admin]       Approve the review
   → compliance_reviews.status = 'approved'
   → Deposit proceeds
   → Audit event written
```

### Journey 7 — Approval chain configuration
```
1. [developer]   Navigate to approval chain for a contract
2. [developer]   Assign commercial, professional, treasury approvers
3. [commercial]  Confirm assigned approver sees pending sign-off in /approvals hub
4.               Full approval chain completes (Journey 1 steps 6–9)
```

### Journey 8 — Variation submitted and approved
```
1. [contractor]  Submit a variation (value change) on an in_progress stage
2. [commercial]  Review and approve variation
   → Stage value updated
   → Funder notified to confirm wallet coverage
3. [funder]      Confirm wallet covers updated value
4.               Stage proceeds to approval as normal
```

### Journey 9 — Password reset flow
```
1. User visits /auth/forgot-password
2. Submits email → receives reset link
3. Clicks link → lands on /auth/reset-password
4. Sets new password → redirected to /projects
5. Old password no longer works
6. New password signs in successfully
```

### Journey 10 — Multi-device / role isolation
```
1. [contractor]  Can only see their own stages — cannot see other contracts
2. [commercial]  Can see approval queue but cannot release payments
3. [funder]      Can see wallet and release but cannot submit evidence
4. [admin]       Can access all views and override controls
```

---

## What to check on every test run

### Wallet integrity
- [ ] After every release: `wallet.balance = previous_balance - stage.value`
- [ ] After every release: `wallet.available_amount` decremented
- [ ] After every release: `wallet_transactions` row of type `release` exists
- [ ] After every ring-fence: `wallet.ringfenced_amount` incremented
- [ ] After every un-ringfence (return/dispute): `wallet.ringfenced_amount` decremented

### Token holder simultaneous payment
- [ ] On every `released` stage, every token holder has a corresponding payment record created at the same timestamp (not sequentially delayed)

### Notifications
- [ ] Correct roles receive notifications at each stage transition
- [ ] `approval_returned` → contractor notified
- [ ] `approved` (all roles) → funder notified (payment ready)
- [ ] `released` → contractor notified

### Audit trail
- [ ] Every status change produces an `audit_events` row
- [ ] `user_id` is never null on an audit row
- [ ] `before_state` and `after_state` are both captured

### KYC gates
- [ ] Unverified user cannot receive payment
- [ ] Unverified user cannot be added to trust as token holder

### Compliance review queue
- [ ] Triggered AML rules create a `compliance_reviews` record
- [ ] Blocked action is not executed until review is approved
- [ ] Approved review unblocks and executes the action

---

## Test conventions

- One `describe` block per journey
- `test.beforeEach` resets relevant DB state
- Use `page.waitForURL` not arbitrary `page.waitForTimeout`
- Assert on DB state (via API) not just UI text where financial integrity is involved
- Tag financial-critical tests with `@critical` — these run on every PR
- Tag slow multi-role tests with `@e2e` — these run nightly

## Flag as blocking

- Any Journey 1–4 test failing
- Wallet balance mismatch after release
- Token holder receiving payment without KYC approval
- AML-flagged action executing without `compliance_reviews` record
