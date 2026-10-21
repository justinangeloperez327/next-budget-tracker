# Production operations — Next Budget Tracker

## Deployment policy

Vercel Git deployment is intentionally disabled: `vercel.json` sets
`git.deploymentEnabled: false`. The CI pipeline runs
`scripts/check-deployment-policy.mjs` before dependency installation and
must fail if this setting is changed. **Do not connect a GitHub push or pull
request to automatic production deployment.**

For a deliberate manual release:

1. Verify the commit on `main` passed lint, typecheck, unit tests,
   PostgreSQL integration tests, production build and desktop/mobile Playwright.
2. Confirm the production database is backed up and migration changes reviewed.
   Verify required environment variables exist in Vercel; never copy secrets
   into repository files, issue descriptions, logs or test fixtures.
3. Deploy manually through the authorized Vercel deployment workflow, using
   `npm run build:vercel`, which runs `prisma generate`,
   `prisma migrate deploy` and `next build`.
4. Smoke-test login, workspace loading, editing, the save revision, reports
   and logout using a controlled non-sensitive account. Review errors.
5. If the release is unhealthy, roll back the deployment through Vercel.
   A code rollback does **not** reverse database migrations. Review the
   migration state and restore strategy before a database intervention.

## Workspace request and transaction limits

- The JSON save envelope (`{ data, revision }`) is limited to **2 MiB**.
  The UI checks UTF-8 bytes before upload; the API enforces a Content-Length
  early check and a separate streamed-body limit. The limit is intentionally
  bounded; it must not be increased without load testing and considering the
  hosting provider's request limits.
- Save mutations run within a single Prisma interactive transaction with
  a **10-second acquisition wait** and a **30-second transaction timeout**.
  The user revision is incremented with an atomic compare-and-swap. Conflicting
  saves return **409** and require a reload.
- Creates and deletes are split into **250-row/key** database operations.
  Unchanged rows are not rewritten, and parent-child reconciliation uses
  keyed membership to avoid quadratic lookup work.
- The full workspace snapshot still transfers on each save. For sustained
  growth toward the 2 MiB limit or frequent 30-second transactions, the next
  architectural step is **versioned per-domain write APIs**, not an unlimited
  request body or a longer global transaction timeout.

## Operational responses

| Symptom | Behavior | Operator action |
| --- | --- | --- |
| HTTP 400 / validation | Save rejected, revision unchanged | Validate dates, amounts, IDs and linked records |
| HTTP 413 | Payload too large, no save performed | Reduce payload or plan per-domain API migration |
| HTTP 409 | Another tab/device committed first | Reload from the database; do not force overwrite |
| HTTP 401 / 403 | Unauthorized session | Reauthenticate; verify session cookies and origin |
| HTTP 503 | Database temporarily unavailable; `Retry-After: 3` | Check database availability, pool and migration health |
| HTTP 500 | Unexpected service failure | Correlate `X-Request-ID` with sanitized server logs |
| Ambiguous network response | Commit may already have happened | Retry with same revision; 409 requires reload |

Unexpected API failures return a request ID. Logs contain the operation, sanitized
error type and known database code, **not** financial payloads, SQL, user email
or authentication tokens. Saves lasting at least 2 seconds log only elapsed time
and an aggregate record count.

Do not treat a passing CI run as a production deployment, and do not perform
schema changes against the personal database during tests.
