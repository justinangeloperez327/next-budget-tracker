# Repository audit — 9 October 2026

Baseline: `5c179262ba7f4d53d899cf6b52542ccd2a0c124a` on `main`.

Reviewed authentication/session handling, workspace reads and writes, React state transitions, linked financial records, historical summaries, validation, dependency risks, and deployment configuration.

## Fixed

| Finding | Correction |
| --- | --- |
| Failed workspace loads rendered empty financial screens | Render records only after a successful, validated load; show an unavailable state otherwise. |
| Invalid edits locked the whole workspace until reload | Validate edits before sending them; keep explicit validation rejections correctable. Preserve blocking behavior for stale revisions and uncertain save outcomes. |
| Save acknowledgements were trusted without revision verification | Require the expected next revision before updating local financial data. Validate revisions on load. |
| Long debt names/remittance recipients produced expense descriptions beyond the 120-character limit | Bound generated descriptions while preserving the full source name. |
| Large saves relied on Prisma's five-second transaction timeout | Allow 30 seconds for atomic workspace writes, with a 10-second acquisition wait. |
| Linked-record validation repeatedly searched arrays | Use indexed lookups while retaining ownership, uniqueness, and accounting checks. |
| Historical dashboards included later debt repayments/savings deposits and later-starting records | Restrict these records to the selected month's end, matching MP2's existing monthly cutoff. |
| Registration allowed password typos and duplicate submissions | Add confirmation and a synchronous submission guard; use replacement navigation after authentication. |
| Public-header logout failures were unhandled | Display a retryable error and guard duplicate requests. |
| Unexpected page failures had no application fallback | Add a Next.js error boundary using the installed version's `retry` API. |
| PHP currency formatting was duplicated | Reuse the government module's formatter. |
| Dashboard success text could survive a later failed save | Clear the previous message before each attempt. |
| Prisma transitive dependencies carried security advisories | Scope overrides to patched `mysql2` and `deepmerge-ts`; retain Prisma 7.10.0. |

## Verification

- Lint with zero allowed warnings, TypeScript checking, production build, and 83 unit tests.
- Local React DOM checks with mocked API responses: failed load hides financial records; invalid input sends no write; HTTP 400 remains correctable; confirmed writes update state; HTTP 409 preserves prior records and blocks subsequent writes.
- Prisma client generation and schema validation.
- Production dependency audit: zero reported vulnerabilities.

The DOM checks verify client behavior, not database persistence or visual layout. Browser binary download was unavailable. No test database credentials were supplied in this workspace; database migration and authenticated integration checks are delegated to the existing GitHub Actions PostgreSQL job. Production data and credentials were not accessed. Live deployment behavior is not certified by these checks.

## Remaining limitations

1. Full dependency audit still flags `braces` through ESLint's globbing dependencies. The advisory currently lists all versions as affected. This is a development-tool finding; production-only audit is clean. Downgrading Next.js's ESLint configuration is not an appropriate fix. Recheck upstream patches.
2. Workspace writes still replace the complete snapshot. Revision checks and transactions protect atomicity, but request size, record limits (including 2,000 expenses), and database work bound growth. Larger accounts should move to record-level mutation endpoints and paginated reads.
3. Historical summaries use current account configuration; they do not reconstruct old names, active states, targets, or schedules. True configuration history requires versioned records.
4. Savings destinations are labels. Wallet balances, wallet-to-wallet transfers, and month-end savings allocation are not implemented and should not be presented as completed features.
5. Reminder delivery remains in-app. Password recovery and email verification are also absent.

Git-triggered Vercel deployment remains disabled. These changes require a manual deployment after CI passes.

Dependency advisories: [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [mysql2 authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [mysql2 compression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
