# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal + shared financial control web app for three specific users (Marilia, Wendy, Nathalia) sharing a household group called "Casa". Each user has fully private financial data; only data explicitly marked as shared is visible to the group. Monorepo: `backend/` (Express + TypeScript + Prisma + PostgreSQL) and `frontend/` (React + TypeScript + Vite + TailwindCSS).

## Commands

### Backend (`backend/`)
```bash
npm run dev              # ts-node-dev, runs src/app.ts with hot reload
npm run build             # tsc -> dist/
npm start                 # node dist/app.js (run build first)
npm run prisma:generate   # regenerate Prisma client after schema changes
npm run prisma:migrate    # prisma migrate dev (creates a new migration)
npm run prisma:seed       # ts-node prisma/seed.ts — recreates demo users/group/mandatory example
```
There is no configured test runner or lint script in `backend/package.json` — verify changes with `npx tsc --noEmit` and by exercising endpoints manually (e.g. `curl`) against a running dev server.

### Frontend (`frontend/`)
```bash
npm run dev       # vite dev server (http://localhost:3000), proxies /api to backend
npm run build      # tsc && vite build (type-checks before bundling — treat tsc errors as build failures)
npm run preview    # serve the production build locally
```
No test runner is configured. Run `npm run build` (which runs `tsc` first) to catch type errors.

### Local DB without Docker
```bash
docker run -d --name financial_db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=financial_control -p 5432:5432 postgres:16-alpine
# or use a system-installed Postgres if the Docker daemon isn't available
```

### Full stack via Docker Compose (from repo root)
```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

### Demo credentials (from seed)
`marilia@casa.com` / `wendy@casa.com` / `nathalia@casa.com`, all password `senha123`.

## Architecture

### Privacy model (the central design constraint)
Almost every domain model (`Account`, `Category`, `Transaction`, `Goal`, `Debt`, `CreditCard`) has **both** a nullable `ownerUserId` and a nullable `groupId`, plus a `visibility` field (`private`/`shared`). This is how the same tables serve both private and shared data:
- Private resource: `ownerUserId` set, `groupId` null.
- Shared resource: `groupId` set, `ownerUserId` null (or, for transactions, both — see below).
- Every controller query MUST filter private reads by `ownerUserId: req.userId` and MUST verify `GroupMember` membership before returning anything scoped by `groupId`. Never rely on the frontend to hide data — enforce filtering server-side in every controller, not just at the route level.

`Transaction` additionally carries `isShared`, `paidByUserId`, `sharedAmount`, and `personalAmount` to support partially-shared expenses (part of a purchase is personal, part is split with the household) without duplicating rows.

### Shared expense settlement
`SharedExpense` has many `SharedExpenseParticipant` rows (one per group member), each tracking `amountDue`, `amountPaid`, and a derived `balance` (`paid - due`). `sharedExpenseController.getSettlementSuggestions` aggregates net balances per person across the group, splits people into creditors (`balance > 0`) and debtors (`balance < 0`), sorts each by magnitude, and greedily matches the largest debtor to the largest creditor until balances zero out — this is the "minimum number of transactions" algorithm. `Settlement` rows persist actual pending/paid compensations between two users; **settlements are not new expenses and must never be counted as income/expense** in dashboards or reports.

There is a mandatory worked example seeded in `prisma/seed.ts` that any change to splitting/settlement logic must continue to satisfy exactly: "Mercado" expense of €222 split equally three ways (€74 each) — Nathalia paid €54 (owes €20), Wendy paid €168 (receives €94 total), Marilia paid €0 (owes €74) → settlements: Marilia→Wendy €74, Nathalia→Wendy €20.

### Budget logic (50/20/10/10/10)
`Category.percentageGroup` keys into the five fixed buckets defined in `backend/src/controllers/budgetController.ts` (`BUDGET_GROUPS`): `necessidades` (50%), `qualidade_vida` (20%), `reserva` (10%), `investimentos` (10%), `objetivos` (10%). `getPrivateBudget(month)` computes target vs. actual spend per bucket against the user's real income for that month — this same constant/shape is reused by the dashboard's `budgetComparison`, so keep both in sync if percentages or bucket keys change.

### Backend layout
- `src/app.ts` — Express bootstrap (cors restricted to `FRONTEND_URL`, `/health`, mounts `src/routes/index.ts`, error handler last).
- `src/middleware/auth.ts` — `authenticate` middleware verifies the JWT and sets `req.userId`; all protected routes depend on this rather than re-deriving identity from request params.
- `src/routes/index.ts` — flat route table, no `/api` prefix here (the frontend's Vite proxy / nginx config adds `/api`). When adding a resource, register routes here and wire `authenticate` explicitly per-route (it is not applied globally).
- `src/controllers/*` — one file per resource; controllers query Prisma directly (no repository/service layer) and are where the ownerUserId/groupId filtering rules above must be applied.
- `prisma/schema.prisma` — snake_case DB columns via `@map`/`@@map`, all money fields `Decimal @db.Decimal(15, 2)`. `prisma/seed.ts` is idempotent (upserts users, find-then-create for group/categories/accounts/the mandatory shared expense) — safe to re-run.
- Note: `CreditCard`/`CreditCardInstallment` models exist in the schema but have no controller/routes wired up yet (intentionally out of MVP scope).

### Frontend layout
- `src/services/api.ts` — single Axios instance (`baseURL: '/api'`); request interceptor reads the JWT from the `auth-storage` localStorage key (written by `src/store/authStore.ts`, a Zustand store with `persist`); response interceptor redirects to `/login` on 401. All HTTP calls go through the typed API modules exported here (`authApi`, `accountApi`, `sharedExpenseApi`, etc.) — don't call axios directly from components.
- `src/types/index.ts` — TS interfaces mirroring backend Prisma models/response shapes; keep in sync when controllers change their response shape.
- Data fetching/mutation goes through TanStack Query (`useQuery`/`useMutation` + `qc.invalidateQueries` on writes) in page components under `src/pages/**`, not through component-level `useEffect` fetches.
- `src/i18n/` — flat `t(key)` lookup over `locales/pt-BR.ts`. All user-facing text must go through this, even though only pt-BR exists today — the lookup indirection is what makes adding `en-US`/`it-IT`/`es-ES` later a non-breaking addition.
- `src/index.css` — Tailwind `@layer components` defines reusable classes (`.card`, `.btn-primary`, `.input-field`, `.badge-*`, etc.) instead of repeating utility strings inline; prefer these existing classes over hand-rolled utility chains.

## Language conventions (non-negotiable)
- All source code, identifiers, DB schema/columns, API routes, and commit messages: **English**.
- All user-facing UI text (labels, validation messages, notifications, chart legends, category names, currency/date formatting): **pt-BR** (Brazilian Portuguese), routed through `src/i18n`.

## Key business rules to preserve
- Account balance = `initialBalance + income - expense + transferIn - transferOut`.
- Transfers (`Transfer` model) are never counted as income or expense.
- A credit card payment must not duplicate the original purchase expense (purchase and installment/payment are linked via `CreditCardInstallment.transactionId`, not two separate transactions).
- Partially-shared expenses must correctly split `personalAmount` vs `sharedAmount` on the same `Transaction` row rather than creating duplicate records.
