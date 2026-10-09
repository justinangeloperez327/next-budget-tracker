import test from "node:test";
import assert from "node:assert/strict";
import { validData, type BudgetData } from "../src/lib/budget.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const legacyBillSnapshot: BudgetData = {
  expenses: [
    {
      id: "91919191-aaaa-4919-8919-919191919191",
      description: "Internet",
      amount: 25000,
      category: "Other",
      date: "2026-10-06",
    },
  ],
  budgets: {},
  categoryBudgets: {},
  recurringBills: [
    {
      id: "92929292-bbbb-4929-8929-929292929292",
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
      id: "93939393-cccc-4939-8939-939393939393",
      billId: "92929292-bbbb-4929-8929-929292929292",
      period: "2026-10",
      amount: 25000,
      paymentDate: "2026-10-05",
      expenseId: "91919191-aaaa-4919-8919-919191919191",
    },
  ],
};

test("saved legacy workspace remains readable when linked expense metadata drifted", () => {
  assert.equal(validData(legacyBillSnapshot), true);
});

test("strict workspace validation still rejects mismatched linked bill expense", () => {
  assert.equal(validWorkspace(legacyBillSnapshot), false);
});

test("strict validation accepts the same snapshot once linkage is synchronized", () => {
  const synchronized: BudgetData = {
    ...legacyBillSnapshot,
    expenses: [
      {
        ...legacyBillSnapshot.expenses[0],
        category: "Housing",
        date: "2026-10-05",
      },
    ],
  };

  assert.equal(validWorkspace(synchronized), true);
});
