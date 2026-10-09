import test from "node:test";
import assert from "node:assert/strict";
import type { BudgetData } from "../src/lib/budget.ts";
import { normalizeManagedExpenseLinks } from "../src/lib/workspace-normalization.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const data: BudgetData = {
  expenses: [
    {
      id: "a1111111-1111-4111-8111-111111111111",
      description: "Internet",
      amount: 1,
      category: "Other",
      date: "2026-10-01",
    },
    {
      id: "a2222222-2222-4222-8222-222222222222",
      description: "Loan",
      amount: 1,
      category: "Food",
      date: "2026-10-01",
    },
    {
      id: "a3333333-3333-4333-8333-333333333333",
      description: "Transfer",
      amount: 1,
      category: "Shopping",
      date: "2026-10-01",
    },
    {
      id: "a4444444-4444-4444-8444-444444444444",
      description: "Manual expense",
      amount: 5000,
      category: "Food",
      date: "2026-10-02",
    },
  ],
  budgets: {},
  recurringBills: [
    {
      id: "b1111111-1111-4111-8111-111111111111",
      name: "Internet",
      category: "Housing",
      amount: 25000,
      frequency: "Monthly",
      dueDay: 5,
      startMonth: "2026-01",
      active: true,
    },
  ],
  billPayments: [
    {
      id: "c1111111-1111-4111-8111-111111111111",
      billId: "b1111111-1111-4111-8111-111111111111",
      period: "2026-10",
      amount: 25000,
      paymentDate: "2026-10-05",
      expenseId: "a1111111-1111-4111-8111-111111111111",
    },
  ],
  debts: [
    {
      id: "b2222222-2222-4222-8222-222222222222",
      name: "Loan",
      lender: "Bank",
      originalAmount: 100000,
      category: "Other",
      startDate: "2026-01-01",
      active: true,
    },
  ],
  debtPayments: [
    {
      id: "c2222222-2222-4222-8222-222222222222",
      debtId: "b2222222-2222-4222-8222-222222222222",
      amount: 10000,
      paymentDate: "2026-10-06",
      expenseId: "a2222222-2222-4222-8222-222222222222",
    },
  ],
  remittances: [
    {
      id: "b3333333-3333-4333-8333-333333333333",
      recipient: "Family",
      destinationType: "Family / person",
      sentAmount: 30000,
      feeAmount: 1000,
      transferDate: "2026-10-07",
      status: "Completed",
      principalAsExpense: true,
      category: "Other",
      expenseId: "a3333333-3333-4333-8333-333333333333",
    },
  ],
};

test("normalization repairs managed expense metadata from source records", () => {
  const normalized = normalizeManagedExpenseLinks(data);

  assert.deepEqual(normalized.expenses[0], {
    ...data.expenses[0],
    amount: 25000,
    category: "Housing",
    date: "2026-10-05",
  });
  assert.deepEqual(normalized.expenses[1], {
    ...data.expenses[1],
    amount: 10000,
    category: "Other",
    date: "2026-10-06",
  });
  assert.deepEqual(normalized.expenses[2], {
    ...data.expenses[2],
    amount: 31000,
    category: "Other",
    date: "2026-10-07",
  });
});

test("normalization leaves ordinary expenses unchanged", () => {
  const normalized = normalizeManagedExpenseLinks(data);
  assert.deepEqual(normalized.expenses[3], data.expenses[3]);
});

test("normalized legacy snapshot satisfies strict write validation", () => {
  assert.equal(validWorkspace(data), false);
  assert.equal(validWorkspace(normalizeManagedExpenseLinks(data)), true);
});
