# Budget Tracker

A clean, responsive budget tracker built with Next.js 16.3.8 (the npm latest stable release at initialization), React 19, TypeScript, Tailwind CSS 4, and official shadcn/ui components.

## Run locally

Use Node.js 24 LTS (minimum 22.13) and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000. No environment variables are needed for the demo.

## Pages

- `/`: homepage
- `/about`: purpose and storage information
- `/contact`: contact form that opens an email draft when configured
- `/login` and `/register`: PostgreSQL account registration and login
- `/dashboard`: monthly budget, spending totals, category breakdown, recent expenses
- `/expenses`: add/edit/delete expenses, description search, category/month filters, CSV export

## PostgreSQL and Vercel setup

1. In Vercel, open this project's Storage tab and connect a PostgreSQL database from Marketplace, such as Prisma Postgres or Neon.
2. Set server-only `DATABASE_URL` from the provider's connection settings. Standard pooled `postgres://` or `postgresql://` URLs use Prisma's pg adapter; `prisma://` and `prisma+postgres://` use Prisma Accelerate. Set `DIRECT_URL` to the provider's direct PostgreSQL URL for migrations when available. Never add a `NEXT_PUBLIC_` prefix to database credentials.
3. Set Vercel's Build Command to `npm run build:vercel` to apply the committed migration before building. Connect preview deployments to a separate preview database; do not run experimental migrations against production. Alternatively, run `npm run db:deploy` once with the target environment's connection and keep the normal build command.
4. Deploy the latest `main`. Open `/register` to create an account, then add a monthly budget and an expense. Log out and back in to verify persistence.

Local setup: put credentials in `.env`, run `npm ci`, `npm run db:deploy`, then `npm run dev`. The normal build and client generation do not require a live database; `build:vercel` and migrations do. Remove the previous Supabase environment variables; Supabase is no longer used.

Users, hashed passwords, sessions, expenses, and monthly budgets live in PostgreSQL. Passwords use salted scrypt hashes. Sessions use random 256-bit cookies with HttpOnly, Secure in production, SameSite=Lax, and a seven-day expiry; only token hashes are stored. Login and registration have database-backed attempt limits. Mutation handlers enforce same-origin requests and authorize every write using the cookie session. Per-user version checks reject conflicting saves from another device or tab.

The UI confirms a save only after PostgreSQL accepts it. Failed saves retain the editor and expose a reload action; the app never silently falls back to demo storage for a failing account database. Up to 2,000 expenses and 600 monthly budgets per account are supported in the current snapshot API. Email verification and password-reset email delivery are not implemented yet.

The guest demo still uses its existing browser storage key and requires no database. Demo records and any older Supabase browser records are not automatically imported into a new account. Keep CSV backups of existing local entries; this migration does not clear browser storage.

## Storage and features

Amounts use integer minor units to avoid floating-point accounting errors. Currency is AED. Each month has a separate budget. New accounts and demo workspaces start empty; no sample expenses are mixed with actual entries. CSV exports the currently filtered expenses, quotes text, and neutralises spreadsheet formulas. Delete requires confirmation. Clearing browser storage deletes demo expenses and budgets; authenticated records remain in PostgreSQL. CSV import and offline account editing are not implemented.

Contact form: set `NEXT_PUBLIC_CONTACT_EMAIL` to your real support address. Submission opens the user's email client; the app does not claim to send mail itself.

## Checks

```sh
npm run lint -- --max-warnings=0
npm run typecheck
npm test
npm run build
```

GitHub Actions runs these checks, migrations, and API integration tests against an isolated PostgreSQL service on main pushes and pull requests. Deploy to Vercel with its default Next.js preset and add the optional environment variables before building.

## Components

shadcn/ui New York component sources were retrieved from the official `shadcn-ui/ui` repository because the CLI registry was unavailable. `components.json` supports future CLI component additions. Component source is MIT licensed; see `THIRD_PARTY_NOTICES.md`.

## Kokonut UI

The homepage uses Kokonut UI Shape Hero and Spotlight Cards. Dashboard summary cards reuse Spotlight Cards with real monthly data. Sources are adapted from `kokonut-labs/kokonutui`, with MIT attribution in `THIRD_PARTY_NOTICES.md`. Shapes are static, card tilt respects reduced motion, and marketing examples are labelled separately from actual expenses. shadcn/ui continues to provide accessible buttons, forms, tables, and dialogs.

The `@kokonutui` registry is configured in `components.json` for future additions:

```sh
npx shadcn@latest add @kokonutui/spotlight-cards
```

Local adaptations live in `src/components/kokonutui`; review changes before overwriting them with registry updates.

## Sakura notebook appearance

Cream paper surfaces, muted sakura accents, light ruled lines, and a small SVG cat companion give the app a stationery-inspired style. Dark mode uses warm charcoal surfaces and dusty pink accents. Financial figures remain prominent; the dashboard leads with the available balance and keeps over-budget feedback neutral in tone.

Light, Dark, and System controls are available in public navigation and the workspace header. Appearance is remembered separately from expense data with `next-themes`; System follows OS changes. Theme styles use semantic tokens across tables, forms, dialogs, and Kokonut components. Reduced-motion preferences disable decorative movement. Illustrations are decorative and hidden from screen readers.
