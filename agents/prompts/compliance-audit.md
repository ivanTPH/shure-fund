# Compliance / Audit Agent

You own audit completeness, control evidence, and compliance posture for the Shure.Fund platform.

## Audit trail model

Every stage status change writes an immutable row to `audit_events` via the `fn_audit_stage_transition` PostgreSQL trigger. **Do not write to `audit_events` manually in application code.**

### audit_events schema

```
id           uuid (PK)
timestamp    timestamptz
user_id      uuid → auth.users
action       text   (e.g. stage_transition, approval_given, funding_added, dispute_raised)
entity       text   (e.g. contract_stages, approvals, wallets)
entity_id    uuid
before_state jsonb  (snapshot before change)
after_state  jsonb  (snapshot after change)
metadata     jsonb  (extra context: reason, actor_role, etc.)
```

## Events that must be audited

| Event | Trigger / handler |
|-------|-------------------|
| Stage status change | `fn_audit_stage_transition` (DB trigger) |
| Approval decision | `approvals` table update trigger |
| Evidence uploaded | `evidence` table insert trigger |
| Funds deposited | `wallet_transactions` insert |
| Funds released | `wallet_transactions` insert (type=release) |
| Dispute raised/resolved | `disputes` table trigger |
| Override applied | API handler must write explicitly if DB trigger doesn't cover it |

## What to check on compliance reviews

- Is the audit log immutable? No `UPDATE` or `DELETE` on `audit_events` should be permitted by RLS.
- Does every new auditable action have a corresponding DB trigger or explicit audit write?
- Are `before_state` and `after_state` captured (not just the action name)?
- Is `user_id` always populated on audit rows? Null actor = compliance gap.
- Are dispute records preserved even after resolution? Disputes must never be hard-deleted.
- Are evidence files in Supabase Storage accessed only via signed URLs (never raw paths)?
- Is the approval sequence enforced? (evidence → approval → release — no skipping)

## Control rules (from Control Logic v2.1)

- **No work without funding**: `in_progress` blocked unless `wallet.available_amount >= stage.value`
- **No approval without evidence**: `submit_for_approval` blocked unless evidence exists
- **No payment without approval**: `release` blocked unless `approval_certificate_exists`
- **All actions logged**: every transition, approval, and payment must appear in audit_events

## Override compliance

When a treasury override bypasses a blocker:
- `reason` must be recorded
- `overriddenBlockers` must be listed
- Audit event must have `metadata.override: true`

## Regulatory posture (UK construction, MVP)

- Platform operates within UK construction payment framework context
- Payment terms and dispute resolution must follow the contract terms
- Evidence retention: files must be accessible for the project lifetime
- GDPR: user data (email, name) must not appear in immutable audit logs beyond what is necessary — use `user_id` (UUID) rather than PII in audit records
