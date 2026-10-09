import test from "node:test";
import assert from "node:assert/strict";
import type { BudgetData } from "../src/lib/budget.ts";
import {
  financialReminders,
  reminderSummary,
} from "../src/lib/reminders.ts";

const data: BudgetData = {
  expenses: [],
  budgets: {},
  categoryBudgets: {},
  governmentAccounts: [
    {
      id: "71717171-aaaa-4717-8717-717171717171",
      provider: "SSS",
      memberType: "OFW",
      frequency: "Monthly",
      active: true,
    },
  ],
  governmentContributions: [
    {
      id: "72727272-bbbb-4727-8727-727272727272",
      accountId: "71717171-aaaa-4717-8717-717171717171",
      period: "2026-08",
      amount: 500000,
      status: "Paid",
      paymentDate: "2026-08-05",
    },
    {
      id: "73737373-cccc-4737-8737-737373737373",
      accountId: "71717171-aaaa-4717-8717-717171717171",
      period: "2026-09",
      amount: 500000,
      status: "Missed",
    },
  ],
  mp2Accounts: [
    {
      id: "74747474-dddd-4747-8747-747474747474",
      name: "MP2 Retirement",
      dividendOption: "Compounded",
      initialPaymentDate: "2021-11-15",
      monthlyTarget: 100000,
      active: true,
    },
  ],
  mp2Deposits: [],
  recurringBills: [
    {
      id: "75757575-eeee-4757-8757-757575757575",
      name: "Internet",
      category: "Housing",
      amount: 25000,
      frequency: "Monthly",
      dueDay: 5,
      startMonth: "2026-01",
      active: true,
    },
  ],
  billPayments: [],
  debts: [
    {
      id: "76767676-ffff-4767-8767-767676767676",
      name: "Personal loan",
      lender: "Bank",
      originalAmount: 300000,
      category: "Other",
      startDate: "2026-01-01",
      dueDate: "2026-10-25",
      active: true,
    },
  ],
  debtPayments: [],
  savingsGoals: [
    {
      id: "77777777-aaaa-4777-8777-777777777777",
      name: "Emergency fund",
      targetAmount: 1000000,
      startDate: "2026-01-01",
      targetDate: "2026-10-30",
      monthlyTarget: 100000,
      active: true,
    },
  ],
  savingsDeposits: [],
  remittances: [
    {
      id: "78787878-bbbb-4787-8787-787878787878",
      recipient: "Family",
      destinationType: "Family / person",
      sentAmount: 100000,
      feeAmount: 1000,
      transferDate: "2026-10-08",
      status: "Pending",
      principalAsExpense: true,
      category: "Other",
    },
  ],
};

test("reminder engine surfaces actionable financial items", () => {
  const reminders = financialReminders(data, "2026-10-09");
  const ids = new Set(reminders.map((entry) => entry.id));

  assert.ok(ids.has("bill:75757575-eeee-4757-8757-757575757575:2026-10"));
  assert.ok(ids.has("debt:76767676-ffff-4767-8767-767676767676"));
  assert.ok(ids.has("contribution:SSS:missed:2026-09"));
  assert.ok(ids.has("contribution:SSS:gaps"));
  assert.ok(ids.has("contribution:SSS:current:2026-10"));
  assert.ok(ids.has("savings:77777777-aaaa-4777-8777-777777777777:deadline"));
  assert.ok(ids.has("mp2:74747474-dddd-4747-8747-747474747474:maturity"));
  assert.ok(ids.has("remittance:78787878-bbbb-4787-8787-787878787878"));
});

test("contribution gaps are summarized instead of one reminder per missing month", () => {
  const reminders = financialReminders(data, "2026-10-09");
  const gaps = reminders.filter((entry) => entry.id === "contribution:SSS:gaps");

  assert.equal(gaps.length, 1);
  assert.match(gaps[0].detail, /prior expected periods have no record/);
  assert.match(gaps[0].detail, /not automatically marked missed/);
});

test("monthly savings and MP2 target reminders wait until late in the month", () => {
  const early = financialReminders(data, "2026-10-09");
  const late = financialReminders(data, "2026-10-20");

  assert.equal(
    early.some((entry) =>
      entry.id.startsWith("savings:77777777-aaaa-4777-8777-777777777777:monthly"),
    ),
    false,
  );
  assert.equal(
    early.some((entry) =>
      entry.id.startsWith("mp2:74747474-dddd-4747-8747-747474747474:monthly"),
    ),
    false,
  );
  assert.equal(
    late.some((entry) =>
      entry.id.startsWith("savings:77777777-aaaa-4777-8777-777777777777:monthly"),
    ),
    true,
  );
  assert.equal(
    late.some((entry) =>
      entry.id.startsWith("mp2:74747474-dddd-4747-8747-747474747474:monthly"),
    ),
    true,
  );
});

test("reminders sort overdue items before lower urgency reminders", () => {
  const reminders = financialReminders(data, "2026-10-09");

  assert.equal(reminders[0].severity, "overdue");
  const summary = reminderSummary(reminders);
  assert.equal(summary.total, reminders.length);
  assert.ok(summary.overdue >= 2);
  assert.ok(summary.dueSoon >= 2);
  assert.ok(summary.pending >= 2);
});

test("matured MP2 account is informational rather than overdue debt-like status", () => {
  const matured = financialReminders(
    {
      ...data,
      mp2Accounts: [
        {
          ...data.mp2Accounts![0],
          initialPaymentDate: "2020-01-01",
          monthlyTarget: undefined,
        },
      ],
    },
    "2026-10-09",
  ).find((entry) => entry.id.endsWith(":maturity"));

  assert.equal(matured?.severity, "info");
  assert.match(matured?.title ?? "", /reached maturity/);
});
