import test from "node:test";
import assert from "node:assert/strict";
import {
  phpMoney,
  sssContributionSummary,
  sssDashboardSnapshot,
  sssExpectedPeriods,
  sssContributionYearHistory,
  sssContributionYears,
  validGovernmentData,
  type GovernmentAccount,
  type GovernmentContribution,
} from "../src/lib/government.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const account: GovernmentAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  provider: "SSS",
  memberType: "OFW",
  accountIdentifier: "12-3456789-0",
  monthlyTarget: 500000,
  frequency: "Monthly",
  active: true,
};

const contributions: GovernmentContribution[] = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    accountId: account.id,
    period: "2026-01",
    amount: 500000,
    paymentDate: "2026-01-15",
    status: "Paid",
    referenceNumber: "REF-001",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    accountId: account.id,
    period: "2026-02",
    amount: 500000,
    status: "Pending",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    accountId: account.id,
    period: "2026-03",
    amount: 500000,
    status: "Missed",
  },
];

test("government contribution values validate", () => {
  assert.equal(validGovernmentData([account], contributions), true);
  assert.equal(
    validGovernmentData(
      [{ ...account, memberType: "Unknown" }],
      contributions,
    ),
    false,
  );
  assert.equal(
    validGovernmentData([account], [
      { ...contributions[0], period: "2026-13" },
    ]),
    false,
  );
});

test("SSS summary counts paid, pending, and missed records", () => {
  assert.deepEqual(sssContributionSummary(account, contributions, 2026), {
    year: 2026,
    totalPaid: 500000,
    paidMonths: 1,
    pendingMonths: 1,
    missedMonths: 1,
    notRequiredMonths: 0,
  });
});

test("SSS history builds a complete 12-month year without inventing missed records", () => {
  const history = sssContributionYearHistory(account, contributions, 2026);

  assert.equal(history.length, 12);
  assert.equal(history[0].period, "2026-01");
  assert.equal(history[0].status, "Paid");
  assert.equal(history[1].status, "Pending");
  assert.equal(history[2].status, "Missed");
  assert.equal(history[3].status, "No record");
  assert.equal(history[3].contribution, undefined);
  assert.equal(history[11].period, "2026-12");
});

test("SSS history year options include current and recorded years", () => {
  const older: GovernmentContribution = {
    ...contributions[0],
    id: "77777777-7777-4777-8777-777777777777",
    period: "2024-12",
  };

  assert.deepEqual(
    sssContributionYears(account, [...contributions, older], 2026),
    [2026, 2024],
  );
});

test("SSS dashboard distinguishes schedule gaps from explicit missed records", () => {
  const dashboard = sssDashboardSnapshot(account, contributions, "2026-10-08");

  assert.equal(dashboard.year, 2026);
  assert.equal(dashboard.currentPeriod, "2026-10");
  assert.equal(dashboard.ytdPaid, 500000);
  assert.equal(dashboard.expectedDuePeriods, 10);
  assert.equal(dashboard.paidExpectedPeriods, 1);
  assert.equal(dashboard.progressRate, 10);
  assert.equal(dashboard.lastPayment?.period, "2026-01");
  assert.equal(dashboard.nextExpectedPeriod, "2026-10");
  assert.deepEqual(dashboard.pendingPeriods, ["2026-02"]);
  assert.deepEqual(dashboard.missedPeriods, ["2026-03"]);
  assert.deepEqual(dashboard.gapPeriods, [
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
  ]);
});

test("SSS quarterly schedule uses quarter-end contribution periods", () => {
  const quarterly = { ...account, frequency: "Quarterly" as const };
  assert.deepEqual(sssExpectedPeriods(quarterly, 2026), [
    "2026-03",
    "2026-06",
    "2026-09",
    "2026-12",
  ]);

  const dashboard = sssDashboardSnapshot(
    quarterly,
    [
      {
        ...contributions[0],
        period: "2026-03",
        paymentDate: "2026-03-20",
      },
      {
        ...contributions[1],
        period: "2026-06",
        status: "Paid",
        paymentDate: "2026-06-20",
      },
    ],
    "2026-10-08",
  );

  assert.equal(dashboard.expectedDuePeriods, 3);
  assert.equal(dashboard.paidExpectedPeriods, 2);
  assert.deepEqual(dashboard.gapPeriods, ["2026-09"]);
  assert.equal(dashboard.nextExpectedPeriod, "2026-12");
  assert.equal(dashboard.lastPayment?.period, "2026-06");
});

test("inactive SSS account has no expected contribution schedule", () => {
  const dashboard = sssDashboardSnapshot(
    { ...account, active: false },
    contributions,
    "2026-10-08",
  );

  assert.deepEqual(sssExpectedPeriods({ ...account, active: false }, 2026), []);
  assert.equal(dashboard.expectedDuePeriods, 0);
  assert.equal(dashboard.nextExpectedPeriod, undefined);
  assert.deepEqual(dashboard.gapPeriods, []);
});

test("workspace validates contribution ownership and paid dates", () => {
  const base = {
    expenses: [],
    budgets: {},
    categoryBudgets: {},
    governmentAccounts: [account],
    governmentContributions: contributions,
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(
    validWorkspace({
      ...base,
      governmentContributions: [
        {
          ...contributions[0],
          accountId: "55555555-5555-4555-8555-555555555555",
        },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      governmentContributions: [
        { ...contributions[0], paymentDate: undefined },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      governmentContributions: [
        contributions[0],
        {
          ...contributions[1],
          id: "66666666-6666-4666-8666-666666666666",
          period: contributions[0].period,
        },
      ],
    }),
    false,
  );
});

test("SSS amounts format in Philippine pesos", () => {
  assert.match(phpMoney(123456), /1,234\.56/);
});
