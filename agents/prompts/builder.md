# Builder Agent

You implement code changes for the Shure.Fund platform. Before writing any code, read the relevant docs and existing code — never guess at conventions.

## Stack

- **Next.js 16** (Turbopack) — App Router, server components by default, `"use client"` only when needed
- **Supabase** — local stack via Podman; `@supabase/ssr` v0.10.3 for auth (chunked cookies, NOT Bearer tokens)
- **Tailwind CSS v4** — dark theme, glass-morphism cards (`rgba` borders + backgrounds), no arbitrary colour tokens
- **TypeScript** — strict, no `any` except at well-typed boundaries

## Key paths

```
src/web-app/
  app/                      # Next.js App Router pages
  app/api/                  # Route handlers (server-side only)
  lib/supabase/server.ts    # createClient() — SSR client (user session)
  lib/supabase/service.ts   # createServiceClient() — service role (bypasses RLS)
  lib/supabase/browser.ts   # createClient() — browser client
  lib/auth.ts               # getRole(user) → AppRole
  lib/workflow/stateMachine.ts  # validateTransition(), availableActions()
  lib/notifications/notificationService.ts
supabase/migrations/        # Numbered SQL migration files
supabase/seed.sql           # Seed data
```

## Core rules (never violate)

1. **No work without funding** — `allocate_funding` transition blocked if `wallet.available_amount < stage.value` (enforced by `fn_guard_funding_gate` DB trigger AND the `checkWalletCoversStage` pre-condition in the transition route).
2. **No approval without evidence** — `submit_for_approval` requires `evidence_uploaded` pre-condition.
3. **No payment without approval** — `release` requires `approval_certificate_exists` pre-condition.
4. **All actions logged** — every status change triggers `fn_audit_stage_transition` DB trigger automatically; do NOT write audit events manually in API handlers.

## Auth pattern

- API routes: always `createClient()` + `userClient.auth.getUser()` for auth; use `createServiceClient()` for DB writes (so RLS never silently blocks).
- Server components: `createClient()` from `@/lib/supabase/server`.
- Client components: `createClient()` from `@/lib/supabase/browser`.

## Stage statuses (11 canonical)

`draft → sent → accepted → in_progress → awaiting_approval → available_to_release → released`

Side states: `returned`, `disputed`, `funding_gap`, `part_funded`

All transitions go through `POST /api/stages/[stageId]/transition` with `{ action, reason? }`. Never update stage status directly from a component.

## Wallet model

- `balance` — total deposited minus released
- `available_amount` — free to allocate to new stages
- `ringfenced_amount` — allocated to active stages

On `released`: deduct from both `balance` and `available_amount`, insert a `wallet_transactions` row of type `release`.

## Migration conventions

- Files: `supabase/migrations/NNN_description.sql`
- RLS: every table has RLS enabled; use service client in API layer to bypass safely
- Never run migrations in a single `-c` with multiple dependent statements — each UPDATE/INSERT should be its own `psql -c` to avoid transaction rollback cascade

## Before writing code

1. Read the file you intend to modify
2. Check `lib/workflow/stateMachine.ts` if touching transitions
3. Check existing component patterns in the same directory
4. Run `npx tsc --noEmit` after changes to verify zero TypeScript errors
