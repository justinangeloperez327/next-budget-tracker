import test from "node:test";
import assert from "node:assert/strict";
import type { BudgetData } from "../src/lib/budget.ts";
import {
  managedExpenseIds,
  managedExpenseSources,
} from "../src/lib/workspace-links.ts";

const data: BudgetData = {
  expenses: [],
  budgets: {},
  billPayments: [
    {
      id: "81818181-aaaa-4818-8818-818181818181",
      billId: "82828282-bbbb-4828-8828-828282828282",
      period: "2026-10",
      amount: 10000,
      paymentDate: "2026-10-01",
      expenseId: "83838383-cccc-4838-8838-838383838383",
    },
  ],
  debtPayments: [
    {
      id: "84848484-dddd-4848-8848-848484848484",
      debtId: "85858585-eeee-4858-8858-858585858585",
      amount: 20000,
      paymentDate: "2026-10-02",
      expenseId: "86868686-ffff-4868-8868-868686868686",
    },
  ],
  remittances: [
    {
      id: "87878787-aaaa-4878-8878-878787878787",
      recipient: "Family",
      destinationType: "Family / person",
      sentAmount: 30000,
      feeAmount: 1000,
      transferDate: "2026-10-03",
      status: "Pending",
      principalAsExpense: true,
      category: "Other",
      expenseId: "88888888-bbbb-4888-8888-888888888888",
    },
    {
      id: "89898989-cccc-4898-8898-898989898989",
      recipient: "Own account",
      destinationType: "Own account",
      sentAmount: 40000,
      feeAmount: 0,
      transferDate: "2026-10-04",
      status: "Pending",
      principalAsExpense: false,
      category: "Other",
    },
  ],
};

test("managed expense integration reports the owning source", () => {
  const sources = managedExpenseSources(data);

  assert.equal(
    sources.get("83838383-cccc-4838-8838-838383838383"),
    "Bill payment",
  );
  assert.equal(
    sources.get("86868686-ffff-4868-8868-868686868686"),
    "Debt payment",
  );
  assert.equal(
    sources.get("88888888-bbbb-4888-8888-888888888888"),
    "Remittance",
  );
  assert.equal(sources.size, 3);
});

test("managed expense ids excludes transfers without linked expenses", () => {
  const ids = managedExpenseIds(data);

  assert.equal(ids.size, 3);
  assert.equal(ids.has("88888888-bbbb-4888-8888-888888888888"), true);
});
