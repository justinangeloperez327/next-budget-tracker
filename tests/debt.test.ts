import test from "node:test";
import assert from "node:assert/strict";
import {
  debtDashboardSnapshot,
  debtSnapshot,
  validDebtData,
  type Debt,
  type DebtPayment,
} from "../src/lib/debt.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const debt: Debt = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  name: "Personal loan",
  lender: "Family",
  originalAmount: 500000,
  category: "Other",
  startDate: "2026-01-10",
  dueDate: "2026-12-31",
  monthlyTarget: 50000,
  active: true,
};

const payment: DebtPayment = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  debtId: debt.id,
  amount: 100000,
  paymentDate: "2026-10-05",
  expenseId: "cccccccc-3333-4333-8333-cccccccccccc",
  referenceNumber: "PAY-001",
};

test("debt values validate", () => {
  assert.equal(validDebtData([debt], [payment]), true);
  assert.equal(
    validDebtData([{ ...debt, lender: "" }], [payment]),
    false,
  );
  assert.equal(
    validDebtData([{ ...debt, dueDate: "2025-12-31" }], [payment]),
    false,
  );
  assert.equal(
    validDebtData([debt], [{ ...payment, paymentDate: "2026-02-31" }]),
    false,
  );
});

test("debt snapshot calculates balance and monthly progress", () => {
  const second: DebtPayment = {
    ...payment,
    id: "dddddddd-4444-4444-8444-dddddddddddd",
    amount: 50000,
    paymentDate: "2026-10-07",
    expenseId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  };
  const snapshot = debtSnapshot(debt, [payment, second], "2026-10-08");

  assert.equal(snapshot.totalPaid, 150000);
  assert.equal(snapshot.remaining, 350000);
  assert.equal(snapshot.currentMonthPaid, 150000);
  assert.equal(snapshot.monthlyTargetProgress, 300);
  assert.equal(snapshot.progressRate, 30);
  assert.equal(snapshot.lastPayment?.paymentDate, "2026-10-07");
  assert.equal(snapshot.status, "Active");
});

test("debt status handles overdue paid-off and inactive states", () => {
  assert.equal(
    debtSnapshot({ ...debt, dueDate: "2026-09-30" }, [], "2026-10-08").status,
    "Overdue",
  );
  assert.equal(
    debtSnapshot(
      { ...debt, originalAmount: payment.amount },
      [payment],
      "2026-10-08",
    ).status,
    "Paid off",
  );
  assert.equal(
    debtSnapshot({ ...debt, active: false }, [], "2026-10-08").status,
    "Inactive",
  );
});

test("debt dashboard aggregates outstanding and overdue balances", () => {
  const overdue: Debt = {
    ...debt,
    id: "ffffffff-6666-4666-8666-ffffffffffff",
    originalAmount: 200000,
    dueDate: "2026-09-30",
  };
  const dashboard = debtDashboardSnapshot(
    [debt, overdue],
    [payment],
    "2026-10-08",
  );

  assert.equal(dashboard.originalDebt, 700000);
  assert.equal(dashboard.totalPaid, 100000);
  assert.equal(dashboard.remaining, 600000);
  assert.equal(dashboard.activeCount, 2);
  assert.equal(dashboard.overdueCount, 1);
});

test("workspace requires debt payments to own a matching linked expense", () => {
  const expense = {
    id: payment.expenseId,
    description: "Debt payment · Personal loan",
    amount: payment.amount,
    category: "Other" as const,
    date: payment.paymentDate,
  };
  const base = {
    expenses: [expense],
    budgets: {},
    categoryBudgets: {},
    governmentAccounts: [],
    governmentContributions: [],
    mp2Accounts: [],
    mp2Deposits: [],
    recurringBills: [],
    billPayments: [],
    debts: [debt],
    debtPayments: [payment],
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(validWorkspace({ ...base, expenses: [] }), false);
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [{ ...expense, amount: payment.amount + 1 }],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      debtPayments: [
        {
          ...payment,
          id: "12121212-7777-4777-8777-121212121212",
          amount: debt.originalAmount,
          expenseId: "13131313-8888-4888-8888-131313131313",
        },
      ],
      expenses: [
        {
          ...expense,
          id: "13131313-8888-4888-8888-131313131313",
          amount: debt.originalAmount,
        },
      ],
    }),
    true,
  );
});

test("workspace rejects repayments above the recorded debt amount", () => {
  const firstExpense = {
    id: payment.expenseId,
    description: "Debt payment · Personal loan",
    amount: 300000,
    category: "Other" as const,
    date: "2026-10-05",
  };
  const secondExpense = {
    id: "14141414-9999-4999-8999-141414141414",
    description: "Debt payment · Personal loan",
    amount: 250000,
    category: "Other" as const,
    date: "2026-10-06",
  };

  assert.equal(
    validWorkspace({
      expenses: [firstExpense, secondExpense],
      budgets: {},
      categoryBudgets: {},
      debts: [debt],
      debtPayments: [
        {
          ...payment,
          amount: 300000,
        },
        {
          ...payment,
          id: "15151515-aaaa-4aaa-8aaa-151515151515",
          amount: 250000,
          paymentDate: "2026-10-06",
          expenseId: secondExpense.id,
        },
      ],
    }),
    false,
  );
});
