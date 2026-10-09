# Budget Tracker

A personal finance tracker built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7, and PostgreSQL.

The app is designed around two financial lanes:

- **AED** for household budgeting, expenses, recurring bills, debt, savings goals, and remittance outflows.
- **PHP** for SSS, PhilHealth, Pag-IBIG, MP2, and remittance receipts.

AED and PHP are never combined into one misleading total.

## Run locally

Use Node.js 24 LTS (minimum 22.13) and npm.

```sh
npm ci
cp .env.example .env
npm run db:deploy
npm run dev
```

Set `DATABASE_URL` in `.env`, then open http://localhost:3000.

## Main workspace

- `/dashboard` — monthly budget, expenses, obligations, savings, remittances, reminders
- `/financial` — combined UAE / Philippines financial overview with currencies kept separate
- `/budget` — monthly and category budget vs. actual
- `/expenses` — expense tracking, search, filters, and CSV export
- `/bills` — recurring bills and linked payment expenses
- `/debts` — debt / utang balances and linked repayments
- `/savings` — AED savings goals and contribution history
- `/remittances` — AED sent, fees, PHP received, and actual effective exchange rate
- `/contributions` — Philippine government contribution overview
- `/sss`, `/philhealth`, `/pagibig` — provider-specific contribution trackers
- `/mp2` — Pag-IBIG MP2 savings tracker
- `/reports` — monthly/yearly financial reports and CSV exports
- `/reports/history` — historical budget analysis
- `/reminders` — in-app financial reminders and attention items

History pages are also available for SSS, PhilHealth, Pag-IBIG, MP2, savings, and remittances.

## Accounting rules

Amounts are stored in integer minor units to avoid floating-point accounting errors.

Important integration rules:

- A recurring bill schedule is not an expense until a payment is recorded.
- A bill payment creates exactly one linked expense.
- A debt balance is not an expense; a repayment creates exactly one linked expense.
- Savings goal deposits are not expenses.
- MP2 deposits are PHP savings, not AED expenses.
- Remittance fees are expenses.
- Family/support remittance principal can count as spending.
- Transfers to the user's own Philippine account can remain money movement instead of spending.
- Missing government contribution periods are treated as **no record**, not automatically as **missed**.
- Linked expenses are managed from their source record and cannot be independently edited or deleted from the expense tracker.

## Data and persistence

All authenticated workspace data is stored in PostgreSQL. New accounts start empty; the application does not inject sample transactions into a user's workspace.

The workspace API uses optimistic revision checks to prevent stale saves from another tab or device. Every write is validated for record ownership, identifiers, limits, linked-record integrity, and accounting relationships before persistence.

Passwords use salted scrypt hashes. Session cookies are random, HttpOnly, SameSite=Lax, Secure in production, and have a seven-day expiry. Login and registration use database-backed attempt limits. Mutation handlers enforce same-origin requests.

## Reminders

The current reminder system is in-app only. It derives reminders from saved financial records, including:

- overdue and due-soon bills
- debt due dates
- government contribution gaps, pending records, and explicitly missed records
- savings target dates
- MP2 target and maturity signals
- pending remittances

Email, SMS, browser push, and mobile push delivery are not implemented.

## Reports

Reports keep AED and PHP columns separate. Monthly and yearly CSV exports include budget performance, bills paid, debt repayments, savings added, remittances, government contributions, and MP2 activity.

Expense CSV export also neutralises spreadsheet-formula prefixes in user-entered descriptions.

## PostgreSQL and Vercel

For Vercel:

1. Connect a PostgreSQL provider such as Prisma Postgres or Neon.
2. Set server-only `DATABASE_URL`.
3. Set `DIRECT_URL` when your provider supplies a direct migration connection.
4. Use `npm run build:vercel` when migrations should run as part of deployment.
5. Use a separate preview database for preview deployments.

Do not expose database credentials through `NEXT_PUBLIC_*` variables.

## Checks

```sh
npm run lint -- --max-warnings=0
npm run typecheck
npm test
npm run db:deploy
npm run build
npm run test:integration
```

GitHub Actions runs lint, type checking, unit tests, Prisma migrations, production build, and authenticated integration tests against an isolated PostgreSQL service.

## UI

The interface uses shadcn/ui-style components with a restrained notebook-inspired visual system. Light, Dark, and System appearance controls are provided through `next-themes`. Decorative Sakura elements do not carry financial meaning and are hidden from assistive technology where appropriate.

Kokonut UI-derived components are attributed in `THIRD_PARTY_NOTICES.md`.
