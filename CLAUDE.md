# Shure.Fund — Claude Project Context

## What this is
A property development finance platform. Funders escrow money into project wallets; contractors submit payment stages with evidence; a multi-role approval chain (commercial → professional → treasury) must sign off before funds are released. All activity is audit-logged.

## Repo structure
```
shure-fund/
├── src/web-app/          ← Next.js 16 app (primary codebase)
│   ├── app/              ← App router pages and API routes
│   ├── lib/              ← Shared utilities
│   │   ├── supabase/     ← browser.ts / server.ts / service.ts clients
│   │   ├── auth.ts       ← getRole(user) helper
│   │   ├── email/        ← emailService.ts (Resend + buildTransactionalEmail)
│   │   └── notifications/← notificationService.ts + pushService.ts
│   └── .env.example      ← Required env vars documented here
└── supabase/
    └── migrations/       ← 001–009 SQL migrations (run in order)
```

## Tech stack
- **Next.js 16** app router — read `node_modules/next/dist/docs/` before touching routing or server components
- **Supabase** — Postgres + Auth + Storage + RLS
- **Tailwind CSS** — utility classes only, no custom components
- **Resend** — transactional email via `RESEND_API_KEY`

## Supabase client usage
| Context | Import |
|---------|--------|
| Client component | `@/lib/supabase/browser` |
| Server component / route handler | `@/lib/supabase/server` (async, awaited) |
| Bypassing RLS (trusted server code) | `@/lib/supabase/service` |

Never use the service client in client components. Never skip RLS without a documented reason.

## Roles
`admin` · `developer` (the property developer/client) · `funder` · `commercial` · `contractor` · `consultant` (maps to "professional" in approval chain) · `treasury` (approval role only, maps to funder/developer/admin)

Role is stored in `auth.users.user_metadata.role` and mirrored to `public.users.role`. Use `getRole(user)` from `@/lib/auth` — never read metadata directly.

## UI conventions (light theme — strictly enforced)
- Page backgrounds: `var(--surface-muted, #f7f8fc)`
- Cards: `background: #fff`, `border: 1px solid var(--surface-border, #e4e7f0)`, `border-radius: 20–28px`
- Primary text: `var(--brand-navy, #0D1144)`
- Muted text: `rgba(13,17,68,0.45–0.6)`
- Status colours: approved `#059669` · rejected `#dc2626` · returned `#ea580c` · pending `#64748b` · in_progress `#2563eb` · awaiting_approval `#7c3aed` · released `#16a34a` · funding_gap `#dc2626`
- Buttons: solid navy `#0D1144` for primary actions, matching status colour for contextual actions
- No dark backgrounds anywhere in the app UI

## Key workflows
1. **Contract → Stages** — admin/developer creates contract with stages; contractor submits evidence; stage transitions through `draft → sent → accepted → in_progress → awaiting_approval → available_to_release → released`
2. **Approval chain** — configured per contract at `/projects/[id]/contracts/[contractId]/approval-chain`; commercial/professional/treasury each submit a decision via `POST /api/stages/[stageId]/approvals`
3. **Notifications** — `notificationService.ts` fires after every state change; inserts to `notifications` table AND sends transactional email via Resend; daily digest via `GET /api/email/digest` (cron at 07:00 UTC)
4. **Wallet** — funder tops up project wallet; funds checked before release

## Branch strategy
- Branch from latest `feature/phase-2-N`, naming next `feature/phase-2-N+1`
- PRs target the previous feature branch (not main directly)
- Always run `npx tsc --noEmit` before committing

## Required Vercel env vars
See `src/web-app/.env.example`. Critical ones:
- `NEXT_PUBLIC_SITE_URL` — used in all email action links
- `RESEND_API_KEY` — without this, emails log to console only
- `DIGEST_SECRET` — secures the daily digest cron endpoint
- `SUPABASE_SERVICE_ROLE_KEY` — used by service client

## Database migrations
Run in order: `001` → `009`. Applied via Supabase dashboard SQL editor or `supabase db push`. Never edit existing migrations — always add a new numbered file.

## Common gotchas
- `params` in Next.js 16 route handlers is a `Promise` — always `await context.params`
- Supabase joined relations return arrays even for single FK joins — use `Array.isArray(x) ? x[0] : x`
- `getRole()` returns `undefined` for users with no metadata — guard before using
- The `users` table has `active` (bool), `push_token` (text) added in migration 003
- `sequence_order` does NOT exist on `contract_stages` — order by `created_at` instead
