import test from "node:test";
import assert from "node:assert/strict";
import { financialDashboardSnapshot } from "../src/lib/financial-dashboard.ts";
import type { BudgetData } from "../src/lib/budget.ts";

const data: BudgetData = {
  expenses: [
    {
      id: "30303030-aaaa-4303-8303-303030303030",
      description: "Rent",
      amount: 180000,
      category: "Housing",
      date: "2026-10-01",
    },
    {
      id: "31313131-bbbb-4313-8313-313131313131",
      description: "Remittance fee",
      amount: 1500,
      category: "Other",
      date: "2026-10-09",
    },
  ],
  budgets: { "2026-10": 500000 },
  categoryBudgets: { "2026-10": { Housing: 200000 } },
  governmentAccounts: [
    {
      id: "32323232-cccc-4323-8323-323232323232",
      provider: "SSS",
      memberType: "OFW",
      monthlyTarget: 500000,
      frequency: "Monthly",
      active: true,
    },
    {
      id: "33333333-dddd-4333-8333-333333333333",
      provider: "PHILHEALTH",
      memberType: "OFW / Migrant Worker",
      monthlyTarget: 250000,
      frequency: "Monthly",
      active: true,
    },
  ],
  governmentContributions: [
    {
      id: "34343434-eeee-4343-8343-343434343434",
      accountId: "32323232-cccc-4323-8323-323232323232",
      period: "2026-10",
      amount: 500000,
      paymentDate: "2026-10-05",
      status: "Paid",
    },
    {
      id: "35353535-ffff-4353-8353-353535353535",
      accountId: "33333333-dddd-4333-8333-333333333333",
      period: "2026-10",
      amount: 250000,
      status: "Pending",
    },
  ],
  mp2Accounts: [
    {
      id: "36363636-aaaa-4363-8363-363636363636",
      name: "MP2",
      dividendOption: "Compounded",
      initialPaymentDate: "2026-01-10",
      monthlyTarget: 100000,
      active: true,
    },
  ],
  mp2Deposits: [
    {
      id: "37373737-bbbb-4373-8373-373737373737",
      accountId: "36363636-aaaa-4363-8363-363636363636",
      paymentDate: "2026-10-06",
      amount: 100000,
    },
    {
      id: "38383838-cccc-4383-8383-383838383838",
      accountId: "36363636-aaaa-4363-8363-363636363636",
      paymentDate: "2026-11-06",
      amount: 100000,
    },
  ],
  recurringBills: [
    {
      id: "39393939-dddd-4393-8393-393939393939",
      name: "Utilities",
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
      id: "40404040-eeee-4404-8404-404040404040",
      name: "Loan",
      lender: "Bank",
      originalAmount: 300000,
      category: "Other",
      startDate: "2026-01-01",
      dueDate: "2026-09-30",
      active: true,
    },
  ],
  debtPayments: [],
  savingsGoals: [
    {
      id: "41414141-ffff-4414-8414-414141414141",
      name: "Emergency fund",
      targetAmount: 1000000,
      startDate: "2026-01-01",
      targetDate: "2026-12-31",
      active: true,
    },
  ],
  savingsDeposits: [
    {
      id: "42424242-aaaa-4424-8424-424242424242",
      goalId: "41414141-ffff-4414-8414-414141414141",
      amount: 200000,
      depositDate: "2026-10-02",
    },
  ],
  remittances: [
    {
      id: "43434343-bbbb-4434-8434-434343434343",
      recipient: "PH Savings",
      destinationType: "Own account",
      sentAmount: 100000,
      feeAmount: 1500,
      receivedAmount: 1550000,
      transferDate: "2026-10-09",
      status: "Completed",
      principalAsExpense: false,
      category: "Other",
      expenseId: "31313131-bbbb-4313-8313-313131313131",
    },
  ],
};

test("financial dashboard keeps AED and PHP lanes separate", () => {
  const snapshot = financialDashboardSnapshot(data, "2026-10", "2026-10-09");

  assert.equal(snapshot.aed.budget, 500000);
  assert.equal(snapshot.aed.spent, 181500);
  assert.equal(snapshot.aed.variance, 318500);
  assert.equal(snapshot.aed.remitted, 100000);
  assert.equal(snapshot.aed.ownAccountTransfers, 100000);

  assert.equal(snapshot.php.governmentYtdPaid, 500000);
  assert.equal(snapshot.php.mp2TotalSaved, 100000);
  assert.equal(snapshot.php.remittanceReceived, 1550000);
});

test("financial dashboard excludes future MP2 deposits from selected month", () => {
  const october = financialDashboardSnapshot(data, "2026-10", "2026-10-09");
  const november = financialDashboardSnapshot(data, "2026-11", "2026-11-30");

  assert.equal(october.mp2.totalSaved, 100000);
  assert.equal(october.mp2.currentMonthSaved, 100000);
  assert.equal(november.mp2.totalSaved, 200000);
  assert.equal(november.mp2.currentMonthSaved, 100000);
});

test("financial dashboard surfaces overdue and contribution attention", () => {
  const snapshot = financialDashboardSnapshot(data, "2026-10", "2026-10-09");
  const ids = new Set(snapshot.attention.map((item) => item.id));

  assert.equal(snapshot.aed.overdueBills, 1);
  assert.equal(snapshot.aed.overdueDebts, 1);
  assert.ok(ids.has("overdue-bills"));
  assert.ok(ids.has("overdue-debts"));
  assert.ok(ids.has("contribution-PHILHEALTH"));
});

test("unconfigured government provider stays distinct from missed contribution", () => {
  const snapshot = financialDashboardSnapshot(data, "2026-10", "2026-10-09");
  const pagIbig = snapshot.contributions.find(
    (entry) => entry.provider === "PAGIBIG",
  );

  assert.equal(pagIbig?.configured, false);
  assert.equal(pagIbig?.attentionCount, 0);
});

test("historical dashboard excludes later debt repayments and savings deposits", () => {
  const laterData: BudgetData = {
    ...data,
    debtPayments: [
      {
        id: "45454545-aaaa-4454-8454-454545454545",
        debtId: data.debts![0].id,
        expenseId: "46464646-aaaa-4464-8464-464646464646",
        amount: 10000,
        paymentDate: "2026-11-01",
      },
    ],
    savingsDeposits: (data.savingsDeposits ?? []).map((deposit) => ({
      ...deposit,
      depositDate: "2026-11-01",
    })),
  };
  const october = financialDashboardSnapshot(
    laterData,
    "2026-10",
    "2026-11-30",
  );
  const november = financialDashboardSnapshot(
    laterData,
    "2026-11",
    "2026-11-30",
  );
  assert.equal(october.debts.totalPaid, 0);
  assert.equal(october.savings.totalSaved, 0);
  assert.ok(november.debts.totalPaid > 0);
  assert.ok(november.savings.totalSaved > 0);
});

test("historical dashboard excludes debts and goals that had not started", () => {
  const laterData: BudgetData = {
    ...data,
    debts: (data.debts ?? []).map((debt) => ({
      ...debt,
      startDate: "2026-11-01",
    })),
    savingsGoals: (data.savingsGoals ?? []).map((goal) => ({
      ...goal,
      startDate: "2026-11-01",
    })),
  };
  const october = financialDashboardSnapshot(
    laterData,
    "2026-10",
    "2026-11-30",
  );
  assert.equal(october.debts.originalDebt, 0);
  assert.equal(october.savings.totalTargets, 0);
});
