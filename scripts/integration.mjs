import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { randomUUID } from "node:crypto";
// Run only against a dedicated test database after migration and build.
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("/budget_tracker_test")
)
  throw Error("Use the isolated budget_tracker_test database.");
const base = "http://127.0.0.1:3099";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3099",
  ],
  { stdio: "inherit" },
);
async function request(
  path,
  { method = "GET", body, cookie, origin = base } = {},
) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
try {
  let started = false;
  for (let n = 0; n < 100; n++) {
    try {
      if ((await request("/api/workspace")).status === 401) {
        started = true;
        break;
      }
    } catch {}
    await setTimeout(100);
  }
  assert.ok(started, "server starts");
  assert.equal((await request("/api/workspace")).status, 401);
  const email = `test-${randomUUID()}@example.com`;
  const credentials = {
    email,
    name: "Test User",
    password: "secure-test-password",
  };
  assert.equal(
    (
      await request("/api/auth/register", {
        method: "POST",
        body: credentials,
        origin: "https://untrusted.example",
      })
    ).status,
    403,
  );
  const registered = await request("/api/auth/register", {
    method: "POST",
    body: credentials,
  });
  assert.equal(registered.status, 200);
  const setCookie = registered.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const cookie = setCookie.split(";")[0];
  assert.equal((await request("/budget", { cookie })).status, 200);
  assert.equal((await request("/reports", { cookie })).status, 200);
  assert.equal((await request("/reports/history", { cookie })).status, 200);
  assert.equal((await request("/sss", { cookie })).status, 200);
  assert.equal((await request("/sss/history", { cookie })).status, 200);
  assert.equal((await request("/contributions", { cookie })).status, 200);
  assert.equal((await request("/philhealth", { cookie })).status, 200);
  assert.equal((await request("/philhealth/history", { cookie })).status, 200);
  const initial = await (await request("/api/workspace", { cookie })).json();
  assert.equal(initial.user.email, email);
  assert.equal(initial.revision, 0);
  const sssAccountId = randomUUID();
  const philHealthAccountId = randomUUID();
  const pagIbigAccountId = randomUUID();
  const data = {
    expenses: [
      {
        id: randomUUID(),
        description: "Lunch",
        category: "Food",
        date: "2026-10-07",
        amount: 9_000_000_000,
      },
    ],
    budgets: { "2026-10": 9_500_000_000 },
    categoryBudgets: { "2026-10": { Food: 8_500_000_000 } },
    governmentAccounts: [
      {
        id: sssAccountId,
        provider: "SSS",
        memberType: "OFW",
        accountIdentifier: "12-3456789-0",
        monthlyTarget: 500000,
        frequency: "Monthly",
        active: true,
      },
      {
        id: philHealthAccountId,
        provider: "PHILHEALTH",
        memberType: "Direct Contributor",
        accountIdentifier: "PH-TEST-001",
        monthlyTarget: 250000,
        frequency: "Monthly",
        active: true,
      },
      {
        id: pagIbigAccountId,
        provider: "PAGIBIG",
        memberType: "Mandatory",
        accountIdentifier: "MID-TEST-001",
        monthlyTarget: 20000,
        frequency: "Monthly",
        active: true,
      },
    ],
    governmentContributions: [
      {
        id: randomUUID(),
        accountId: sssAccountId,
        period: "2026-10",
        amount: 500000,
        paymentDate: "2026-10-07",
        status: "Paid",
        referenceNumber: "SSS-TEST-001",
        notes: "Integration test contribution",
      },
      {
        id: randomUUID(),
        accountId: philHealthAccountId,
        period: "2026-10",
        amount: 250000,
        paymentDate: "2026-10-06",
        status: "Paid",
        referenceNumber: "PH-TEST-001",
      },
      {
        id: randomUUID(),
        accountId: pagIbigAccountId,
        period: "2026-10",
        amount: 20000,
        status: "Pending",
        notes: "Awaiting payment confirmation",
      },
    ],
  };
  assert.equal(
    (
      await request("/api/workspace", {
        method: "PUT",
        body: { data, revision: 0 },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/workspace", {
        method: "PUT",
        cookie,
        body: { data, revision: 0 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/workspace", {
        method: "PUT",
        cookie,
        body: { data: { expenses: [], budgets: {} }, revision: 0 },
      })
    ).status,
    409,
  );
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie })).json()).data,
    data,
  );
  const second = await request("/api/auth/register", {
    method: "POST",
    body: { ...credentials, email: `second-${randomUUID()}@example.com` },
  });
  const secondCookie = second.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie: secondCookie })).json())
      .data,
    {
      expenses: [],
      budgets: {},
      categoryBudgets: {},
      governmentAccounts: [],
      governmentContributions: [],
    },
  );
  assert.equal(
    (
      await request("/api/auth/login", {
        method: "POST",
        body: { ...credentials, password: "incorrect-password" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/api/auth/logout", { method: "POST", cookie })).status,
    200,
  );
  assert.equal((await request("/api/workspace", { cookie })).status, 401);
  const login = await request("/api/auth/login", {
    method: "POST",
    body: credentials,
  });
  assert.equal(login.status, 200);
  const newCookie = login.headers.get("set-cookie").split(";")[0];
  assert.notEqual(newCookie, cookie);
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie: newCookie })).json())
      .data,
    data,
  );
  assert.equal(
    (
      await request("/api/workspace", {
        method: "PUT",
        cookie: newCookie,
        body: { data: { expenses: [], budgets: {} }, revision: 1 },
      })
    ).status,
    200,
  );
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie: newCookie })).json())
      .data,
    {
      expenses: [],
      budgets: {},
      categoryBudgets: {},
      governmentAccounts: [],
      governmentContributions: [],
    },
  );
  console.log(
    "PASS: registration, session cookies, login/logout, persistence, isolation, deletion, CSRF and stale-write protection.",
  );
} finally {
  server.kill("SIGTERM");
}
