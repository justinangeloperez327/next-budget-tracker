import test from "node:test";
import assert from "node:assert/strict";
import {
  remittanceEffectiveRate,
  remittanceExpenseAmount,
  remittanceHistoryYears,
  remittanceMonthSummary,
  remittanceMonthlyHistory,
  validRemittanceData,
  type Remittance,
} from "../src/lib/remittance.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const family: Remittance = {
  id: "21212121-aaaa-4212-8212-212121212121",
  recipient: "Family",
  destinationType: "Family / person",
  provider: "Exchange House",
  sentAmount: 100000,
  feeAmount: 1500,
  receivedAmount: 1550000,
  transferDate: "2026-10-08",
  status: "Completed",
  principalAsExpense: true,
  category: "Other",
  expenseId: "22222222-bbbb-4222-8222-222222222222",
  referenceNumber: "REM-001",
};

const ownAccount: Remittance = {
  id: "23232323-cccc-4232-8232-232323232323",
  recipient: "PH Savings",
  destinationType: "Own account",
  sentAmount: 200000,
  feeAmount: 1000,
  receivedAmount: 3100000,
  transferDate: "2026-10-09",
  status: "Completed",
  principalAsExpense: false,
  category: "Other",
  expenseId: "24242424-dddd-4242-8242-242424242424",
};

test("remittance values validate", () => {
  assert.equal(validRemittanceData([family, ownAccount]), true);
  assert.equal(
    validRemittanceData([{ ...family, sentAmount: 0 }]),
    false,
  );
  assert.equal(
    validRemittanceData([
      { ...family, status: "Completed", receivedAmount: undefined },
    ]),
    false,
  );
  assert.equal(
    validRemittanceData([{ ...family, transferDate: "2026-02-31" }]),
    false,
  );
});

test("remittance expense amount separates spending from own transfers", () => {
  assert.equal(remittanceExpenseAmount(family), 101500);
  assert.equal(remittanceExpenseAmount(ownAccount), 1000);
  assert.equal(
    remittanceExpenseAmount({
      ...ownAccount,
      feeAmount: 0,
      expenseId: undefined,
    }),
    0,
  );
});

test("effective rate derives from actual AED and PHP amounts", () => {
  assert.equal(remittanceEffectiveRate(family), 15.5);
  assert.equal(
    remittanceEffectiveRate({ ...family, status: "Pending" }),
    undefined,
  );
});

test("monthly summary separates support and own-account transfers", () => {
  const summary = remittanceMonthSummary([family, ownAccount], "2026-10");
  assert.equal(summary.count, 2);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.pendingCount, 0);
  assert.equal(summary.sentAmount, 300000);
  assert.equal(summary.feeAmount, 2500);
  assert.equal(summary.receivedAmount, 4650000);
  assert.equal(summary.supportAmount, 100000);
  assert.equal(summary.ownTransferAmount, 200000);
  assert.equal(summary.effectiveRate, 15.5);
});

test("remittance history aggregates by month and year", () => {
  const months = remittanceMonthlyHistory([family, ownAccount], 2026);
  assert.equal(months[9].sentAmount, 300000);
  assert.equal(months[9].count, 2);
  assert.deepEqual(remittanceHistoryYears([family], 2027), [2027, 2026]);
});

test("workspace requires exact linked family-support expense", () => {
  const base = {
    expenses: [
      {
        id: family.expenseId!,
        description: "Remittance · Family",
        amount: 101500,
        category: "Other" as const,
        date: family.transferDate,
      },
    ],
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
    remittances: [family],
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [{ ...base.expenses[0], amount: 100000 }],
    }),
    false,
  );
});

test("own-account remittance links only its fee expense", () => {
  const workspace = {
    expenses: [
      {
        id: ownAccount.expenseId!,
        description: "Remittance · PH Savings",
        amount: 1000,
        category: "Other" as const,
        date: ownAccount.transferDate,
      },
    ],
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
    remittances: [ownAccount],
  };

  assert.equal(validWorkspace(workspace), true);
  assert.equal(
    validWorkspace({
      ...workspace,
      remittances: [
        {
          ...ownAccount,
          feeAmount: 0,
          expenseId: undefined,
        },
      ],
      expenses: [],
    }),
    true,
  );
});
