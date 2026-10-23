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
  const homepage = await request("/");
  assert.equal(homepage.status, 200);
  assert.doesNotMatch(await homepage.text(), /Illustrative budget|AED 5,000 budget/);
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
  const dashboardPage = await request("/dashboard", { cookie });
  assert.equal(dashboardPage.status, 200);
  const dashboardHtml = await dashboardPage.text();
  assert.match(dashboardHtml, /Skip to content/);
  assert.match(dashboardHtml, /Financial overview/);
  assert.match(dashboardHtml, /Reminders/);
  assert.equal((await request("/expenses", { cookie })).status, 200);
  assert.equal((await request("/budget", { cookie })).status, 200);
  assert.equal((await request("/reports", { cookie })).status, 200);
  assert.equal((await request("/reports/history", { cookie })).status, 200);
  assert.equal((await request("/sss", { cookie })).status, 200);
  assert.equal((await request("/sss/history", { cookie })).status, 200);
  assert.equal((await request("/contributions", { cookie })).status, 200);
  assert.equal((await request("/philhealth", { cookie })).status, 200);
  assert.equal((await request("/philhealth/history", { cookie })).status, 200);
  assert.equal((await request("/pagibig", { cookie })).status, 200);
  assert.equal((await request("/pagibig/history", { cookie })).status, 200);
  assert.equal((await request("/mp2", { cookie })).status, 200);
  assert.equal((await request("/mp2/history", { cookie })).status, 200);
  assert.equal((await request("/bills", { cookie })).status, 200);
  assert.equal((await request("/debts", { cookie })).status, 200);
  assert.equal((await request("/savings", { cookie })).status, 200);
  assert.equal((await request("/savings/history", { cookie })).status, 200);
  assert.equal((await request("/remittances", { cookie })).status, 200);
  assert.equal((await request("/remittances/history", { cookie })).status, 200);
  assert.equal((await request("/financial", { cookie })).status, 200);
  assert.equal((await request("/reminders", { cookie })).status, 200);
  const initial = await (await request("/api/workspace", { cookie })).json();
  assert.equal(initial.user.email, email);
  assert.equal(initial.revision, 0);
  const sssAccountId = randomUUID();
  const philHealthAccountId = randomUUID();
  const pagIbigAccountId = randomUUID();
  const mp2AccountId = randomUUID();
  const rentBillId = randomUUID();
  const rentExpenseId = randomUUID();
  const debtId = randomUUID();
  const debtExpenseId = randomUUID();
  const savingsGoalId = randomUUID();
  const remittanceExpenseId = randomUUID();
  const data = {
    expenses: [
      {
        id: randomUUID(),
        description: "Lunch",
        category: "Food",
        date: "2026-10-07",
        amount: 9_000_000_000,
      },
      {
        id: rentExpenseId,
        description: "Rent",
        category: "Housing",
        date: "2026-10-01",
        amount: 185000,
      },
      {
        id: debtExpenseId,
        description: "Debt payment · Personal loan",
        category: "Other",
        date: "2026-10-08",
        amount: 50000,
      },
      {
        id: remittanceExpenseId,
        description: "Remittance · Family",
        category: "Other",
        date: "2026-10-09",
        amount: 101500,
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
        memberType: "Mandatory - OFW",
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
    mp2Accounts: [
      {
        id: mp2AccountId,
        name: "MP2 Retirement",
        accountNumber: "MP2-TEST-001",
        dividendOption: "Compounded",
        initialPaymentDate: "2026-10-01",
        monthlyTarget: 100000,
        active: true,
      },
    ],
    mp2Deposits: [
      {
        id: randomUUID(),
        accountId: mp2AccountId,
        paymentDate: "2026-10-07",
        amount: 100000,
        referenceNumber: "MP2-PAY-001",
        notes: "Integration test MP2 savings",
      },
    ],
    recurringBills: [
      {
        id: rentBillId,
        name: "Rent",
        category: "Housing",
        amount: 190000,
        frequency: "Monthly",
        dueDay: 1,
        startMonth: "2026-01",
        active: true,
        notes: "Integration recurring bill",
      },
    ],
    billPayments: [
      {
        id: randomUUID(),
        billId: rentBillId,
        period: "2026-10",
        amount: 185000,
        paymentDate: "2026-10-01",
        expenseId: rentExpenseId,
        referenceNumber: "RENT-OCT-2026",
      },
    ],
    debts: [
      {
        id: debtId,
        name: "Personal loan",
        lender: "Family",
        originalAmount: 500000,
        category: "Other",
        startDate: "2026-01-10",
        dueDate: "2026-12-31",
        monthlyTarget: 50000,
        active: true,
        notes: "Integration test debt",
      },
    ],
    debtPayments: [
      {
        id: randomUUID(),
        debtId,
        amount: 50000,
        paymentDate: "2026-10-08",
        expenseId: debtExpenseId,
        referenceNumber: "DEBT-PAY-001",
      },
    ],
    savingsGoals: [
      {
        id: savingsGoalId,
        name: "Emergency fund",
        targetAmount: 1000000,
        startDate: "2026-01-01",
        targetDate: "2026-12-31",
        monthlyTarget: 100000,
        destination: "UAE Savings Bank",
        active: true,
        notes: "Integration test savings goal",
      },
    ],
    savingsDeposits: [
      {
        id: randomUUID(),
        goalId: savingsGoalId,
        amount: 150000,
        depositDate: "2026-10-08",
        referenceNumber: "SAVE-001",
        notes: "Integration test savings",
      },
    ],
    remittances: [
      {
        id: randomUUID(),
        recipient: "Family",
        destinationType: "Family / person",
        provider: "Exchange House",
        sentAmount: 100000,
        feeAmount: 1500,
        receivedAmount: 1550000,
        transferDate: "2026-10-09",
        status: "Completed",
        principalAsExpense: true,
        category: "Other",
        expenseId: remittanceExpenseId,
        referenceNumber: "REM-TEST-001",
        notes: "Integration test remittance",
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
  // PostgreSQL xmin changes when a row is UPDATEd or DELETEd/reinserted.
  // Assert unchanged rows survive both no-op and single-record edits.
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const owner = (await client.query('SELECT id FROM "User" WHERE email = $1', [email])).rows[0].id;
    const version = async (table, column, value) => {
      assert.ok(["Expense", "Budget"].includes(table));
      assert.ok(["id", "month"].includes(column));
      const rows = await client.query(
        `SELECT xmin::text AS version FROM "${table}" WHERE "userId" = $1 AND "${column}" = $2`,
        [owner, value],
      );
      assert.equal(rows.rows.length, 1);
      return rows.rows[0].version;
    };
    const expenseId = data.expenses[0].id;
    const expenseBefore = await version("Expense", "id", expenseId);
    const budgetBefore = await version("Budget", "month", "2026-10");
    const noop = await request("/api/workspace", { method: "PUT", cookie, body: { data, revision: 1 } });
    assert.equal(noop.status, 200);
    assert.equal((await noop.json()).revision, 2);
    assert.equal(await version("Expense", "id", expenseId), expenseBefore);
    assert.equal(await version("Budget", "month", "2026-10"), budgetBefore);

    const amended = { ...data, budgets: { ...data.budgets, "2026-10": 9_400_000_000 } };
    const edit = await request("/api/workspace", { method: "PUT", cookie, body: { data: amended, revision: 2 } });
    assert.equal(edit.status, 200);
    assert.equal((await edit.json()).revision, 3);
    assert.equal(await version("Expense", "id", expenseId), expenseBefore);
    assert.notEqual(await version("Budget", "month", "2026-10"), budgetBefore);
    assert.deepEqual((await (await request("/api/workspace", { cookie })).json()).data, amended);

    const restored = await request("/api/workspace", { method: "PUT", cookie, body: { data, revision: 3 } });
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).revision, 4);
    assert.equal(await version("Expense", "id", expenseId), expenseBefore);
  } finally {
    await client.end();
  }
  // Group 24: real concurrent submissions must have one winner. The loser
  // must not roll back the winner or create partial child/expense rows.
  const raceRevision = 4;
  const raceA = {
    ...data,
    budgets: { ...data.budgets, "2026-10": 410_000 },
    expenses: [...data.expenses, {
      id: randomUUID(),
      description: "Concurrent writer A",
      amount: 125,
      category: "Food",
      date: "2026-10-12",
    }],
  };
  const raceB = {
    ...data,
    budgets: { ...data.budgets, "2026-10": 420_000 },
    expenses: [...data.expenses, {
      id: randomUUID(),
      description: "Concurrent writer B",
      amount: 225,
      category: "Food",
      date: "2026-10-12",
    }],
  };
  const [raceResponseA, raceResponseB] = await Promise.all([
    request("/api/workspace", {
      method: "PUT", cookie, body: { data: raceA, revision: raceRevision },
    }),
    request("/api/workspace", {
      method: "PUT", cookie, body: { data: raceB, revision: raceRevision },
    }),
  ]);
  assert.deepEqual(
    [raceResponseA.status, raceResponseB.status].sort((a, b) => a - b),
    [200, 409],
    "only one competing writer can commit",
  );
  const raceWinner = raceResponseA.status === 200 ? raceA : raceB;
  const raceLoser = raceResponseA.status === 409 ? raceA : raceB;
  const raced = await (await request("/api/workspace", { cookie })).json();
  assert.equal(raced.revision, 5);
  assert.deepEqual(raced.data, raceWinner);
  assert.ok(!raced.data.expenses.some((entry) =>
    entry.id === raceLoser.expenses.at(-1).id,
  ), "the losing transaction creates no expense");
  const staleRetry = await request("/api/workspace", {
    method: "PUT", cookie, body: { data: raceLoser, revision: raceRevision },
  });
  assert.equal(staleRetry.status, 409);

  // Hundreds of expenses: create, load, update, and delete while retaining
  // linked payments/other financial records. Also verify the 600 kB API
  // boundary rejects without incrementing revision or mutating rows.
  const bulkExpenses = Array.from({ length: 350 }, (_, i) => ({
    id: randomUUID(),
    description: `Bulk regression expense ${String(i).padStart(3, "0")}`,
    amount: 101 + (i % 97),
    category: "Food",
    date: "2026-10-11",
  }));
  const largeData = { ...data, expenses: [...data.expenses, ...bulkExpenses] };
  const savedLarge = await request("/api/workspace", {
    method: "PUT", cookie, body: { data: largeData, revision: 5 },
  });
  const savedLargeBody = await savedLarge.json();
  assert.equal(savedLarge.status, 200, JSON.stringify(savedLargeBody));
  assert.equal(savedLargeBody.revision, 6);
  const largeRead = await (await request("/api/workspace", { cookie })).json();
  assert.equal(largeRead.revision, 6);
  assert.deepEqual(largeRead.data, largeData);
  assert.equal(
    largeRead.data.expenses.reduce((sum, entry) => sum + entry.amount, 0),
    largeData.expenses.reduce((sum, entry) => sum + entry.amount, 0),
  );

  const truncatedData = {
    ...largeData,
    expenses: largeData.expenses
      .filter((entry) => entry.id !== bulkExpenses[0].id)
      .map((entry) => entry.id === bulkExpenses[1].id
        ? { ...entry, amount: entry.amount + 50 }
        : entry),
  };
  const changedLarge = await request("/api/workspace", {
    method: "PUT", cookie, body: { data: truncatedData, revision: 6 },
  });
  const changedLargeBody = await changedLarge.json();
  assert.equal(changedLarge.status, 200, JSON.stringify(changedLargeBody));
  assert.equal(changedLargeBody.revision, 7);
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie })).json()).data,
    truncatedData,
  );

  const oversized = await request("/api/workspace", {
    method: "PUT", cookie,
    body: { data: truncatedData, revision: 7, padding: "x".repeat(2_100_000) },
  });
  assert.equal(oversized.status, 413, "requests exceeding the 2 MiB limit are rejected");
  assert.equal(
    (await (await request("/api/workspace", { cookie })).json()).revision,
    7,
    "413 must not advance the optimistic revision",
  );
  assert.deepEqual(
    (await (await request("/api/workspace", { cookie })).json()).data,
    truncatedData,
    "413 must not mutate financial records",
  );

  // Restore the original financial fixture for the subsequent auth tests.
  const restoreFixture = await request("/api/workspace", {
    method: "PUT", cookie, body: { data, revision: 7 },
  });
  const restoreFixtureBody = await restoreFixture.json();
  assert.equal(restoreFixture.status, 200, JSON.stringify(restoreFixtureBody));
  assert.equal(restoreFixtureBody.revision, 8);

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
      mp2Accounts: [],
      mp2Deposits: [],
      recurringBills: [],
      billPayments: [],
      debts: [],
      debtPayments: [],
      savingsGoals: [],
      savingsDeposits: [],
      remittances: [],
    },
  );
  // User B can use the same expense UUID as User A without changing A's
  // composite-keyed record or replacing A's budget.
  const isolated = {
    expenses: [{ ...data.expenses[0], amount: data.expenses[0].amount + 123 }],
    budgets: { "2026-10": 17_500 },
  };
  const isolatedSave = await request("/api/workspace", {
    method: "PUT",
    cookie: secondCookie,
    body: { data: isolated, revision: 0 },
  });
  assert.equal(isolatedSave.status, 200, await isolatedSave.text());
  const secondWorkspace = await (await request("/api/workspace", {
    cookie: secondCookie,
  })).json();
  assert.equal(secondWorkspace.revision, 1);
  assert.equal(secondWorkspace.data.expenses[0].amount, isolated.expenses[0].amount);
  assert.equal(secondWorkspace.data.budgets["2026-10"], 17_500);
  const firstWorkspace = await (await request("/api/workspace", { cookie })).json();
  assert.equal(firstWorkspace.revision, 8);
  assert.deepEqual(firstWorkspace.data, data);

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
        body: { data: { expenses: [], budgets: {} }, revision: 8 },
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
      mp2Accounts: [],
      mp2Deposits: [],
      recurringBills: [],
      billPayments: [],
      debts: [],
      debtPayments: [],
      savingsGoals: [],
      savingsDeposits: [],
      remittances: [],
    },
  );
  // Native Android bearer sessions must remain independent of browser cookies.
  const mobileRequest = (path, { method = "GET", body, token, headers = {} } = {}) =>
    fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  assert.equal((await mobileRequest("/api/mobile/workspace")).status, 401);
  assert.equal((await mobileRequest("/api/mobile/auth/login", {
    method: "POST", body: credentials, headers: { Origin: "https://untrusted.example" },
  })).status, 403);
  assert.equal((await mobileRequest("/api/mobile/auth/login", {
    method: "POST", body: { ...credentials, password: "wrong-password" },
  })).status, 401);
  const mobileLogin = await mobileRequest("/api/mobile/auth/login", { method: "POST", body: credentials });
  assert.equal(mobileLogin.status, 200);
  assert.equal(mobileLogin.headers.get("set-cookie"), null, "mobile auth must not issue browser cookies");
  const mobileAuth = await mobileLogin.json();
  assert.equal(mobileAuth.user.email, email);
  assert.match(mobileAuth.accessToken, /^[a-f0-9]{64}$/);
  const bearer = mobileAuth.accessToken;
  assert.equal((await mobileRequest("/api/workspace", { token: bearer })).status, 401,
    "web API cannot be authenticated using a bearer token");
  assert.equal((await mobileRequest("/api/mobile/workspace", {
    token: bearer, headers: { Cookie: newCookie },
  })).status, 403, "mobile workspace cannot accept cookies");
  const beforeMobile = await (await mobileRequest("/api/mobile/workspace", { token: bearer })).json();
  assert.equal(beforeMobile.revision, 9);
  assert.deepEqual(beforeMobile.data.expenses, []);
  const mobileData = { ...beforeMobile.data, budgets: { "2026-10": 200_00 },
    expenses: [{ id: randomUUID(), description: "Android lunch", amount: 1250,
      category: "Food", date: "2026-10-23" }] };
  const mobilePut = await mobileRequest("/api/mobile/workspace", {
    method: "PUT", token: bearer, body: { revision: beforeMobile.revision, data: mobileData },
  });
  assert.equal(mobilePut.status, 200, await mobilePut.text());
  const webAfterMobile = await (await request("/api/workspace", { cookie: newCookie })).json();
  assert.equal(webAfterMobile.revision, 10);
  assert.deepEqual(webAfterMobile.data, mobileData, "mobile writes must be visible on the web");
  const conflict = await mobileRequest("/api/mobile/workspace", { method: "PUT", token: bearer,
    body: { revision: 9, data: beforeMobile.data } });
  assert.equal(conflict.status, 409, "stale mobile saves must not overwrite web changes");
  assert.equal((await mobileRequest("/api/mobile/auth/logout", { method: "POST", token: bearer })).status, 200);
  assert.equal((await mobileRequest("/api/mobile/workspace", { token: bearer })).status, 401);
  // Second user stays isolated from the first user mobile changes.
  assert.equal((await (await request("/api/workspace", { cookie: secondCookie })).json()).revision, 1);
  console.log("PASS: mobile bearer login/logout, isolation, secure headers, shared saves, stale revision rejection.");
  console.log(
    "PASS: registration, session cookies, login/logout, persistence, isolation, deletion, CSRF and stale-write protection.",
  );
} finally {
  server.kill("SIGTERM");
}
