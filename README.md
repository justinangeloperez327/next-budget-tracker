# Budget Tracker

A clean, responsive budget tracker built with Next.js 16.3.8 (the npm latest stable release at initialization), React 19, TypeScript, Tailwind CSS 4, and official shadcn/ui components.

## Run locally

Use Node.js 24 LTS (minimum 22.13) and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No environment variables are needed for the demo.

## Pages

- `/`: homepage
- `/about`: purpose and storage information
- `/contact`: contact form that opens an email draft when configured
- `/login` and `/register`: Supabase account access
- `/dashboard`: monthly budget, spending totals, category breakdown, recent expenses
- `/expenses`: add/edit/delete expenses, description search, category/month filters, CSV export

## Account configuration

Create a Supabase project and enable email/password authentication. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` or your deployment environment. Use a public publishable key; never a service-role key. Configure the Supabase Auth Site URL for your deployment and enable email confirmation. Register, confirm your email, and log in. Without these variables, authentication buttons are disabled and the app clearly offers a demo.

Account access is implemented with Supabase Auth. Expense data remains in localStorage, separated by authenticated user ID or demo workspace; it does not sync across devices. Workspace routes expose only local browser data and have no private server API. This is an initial local-storage application, not a server-persisted finance system. Account sign-out switches back to the demo workspace. Account data is not deleted from the device on sign-out, so do not use a shared browser profile for sensitive records.

## Storage and features

Amounts use integer minor units to avoid floating-point accounting errors. Currency is AED. Each month has a separate budget. New workspaces start empty; no sample expenses are mixed with actual entries. CSV exports the currently filtered expenses, quotes text, and neutralises spreadsheet formulas. Delete requires confirmation. Clearing browser storage deletes local expenses and budgets; export a CSV backup first. CSV import and cloud syncing are not yet implemented.

Contact form: set `NEXT_PUBLIC_CONTACT_EMAIL` to your real support address. Submission opens the user's email client; the app does not claim to send mail itself.

## Checks

```sh
npm run lint -- --max-warnings=0
npm run typecheck
npm test
npm run build
```

GitHub Actions runs these checks on main pushes and pull requests. Deploy to Vercel with its default Next.js preset and add the optional environment variables before building.

## Components

shadcn/ui New York component sources were retrieved from the official `shadcn-ui/ui` repository because the CLI registry was unavailable. `components.json` supports future CLI component additions. Component source is MIT licensed; see `THIRD_PARTY_NOTICES.md`.

## Kokonut UI

The homepage uses Kokonut UI Shape Hero and Spotlight Cards. Dashboard summary cards reuse Spotlight Cards with real monthly data. Sources are adapted from `kokonut-labs/kokonutui`, with MIT attribution in `THIRD_PARTY_NOTICES.md`. Shapes are static, card tilt respects reduced motion, and marketing examples are labelled separately from actual expenses. shadcn/ui continues to provide accessible buttons, forms, tables, and dialogs.

The `@kokonutui` registry is configured in `components.json` for future additions:

```sh
npx shadcn@latest add @kokonutui/spotlight-cards
```

Local adaptations live in `src/components/kokonutui`; review changes before overwriting them with registry updates.

The app uses a Kokonut-style neutral palette: white surfaces, zinc text and borders, and charcoal primary actions. Decorative hero and spotlight colors stay monochrome; destructive and over-budget indicators retain red for clarity.
