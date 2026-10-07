import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryBudgetSummaries,
  total,
  validData,
  csv,
  type BudgetData,
  type Expense,
} from "../src/lib/budget.ts";

const example: Expense = {
  id: "a",
  description: "Lunch",
  amount: 1250,
  category: "Food",
  date: "2026-10-05",
};

test("totals use integer minor units", () => {
  assert.equal(total([example, { ...example, id: "b", amount: 10 }]), 1260);
  assert.equal(total([]), 0);
});

test("accepts category budgets and rejects corrupt persisted values", () => {
  assert.ok(
    validData({
      expenses: [example],
      budgets: { "2026-10": 50000 },
      categoryBudgets: {
        "2026-10": { Housing: 190000, Food: 50000 },
      },
    }),
  );
  assert.equal(
    validData({
      expenses: [{ ...example, amount: 12.5 }],
      budgets: {},
      categoryBudgets: {},
    }),
    false,
  );
  assert.equal(
    validData({
      expenses: [{ ...example, category: "Unknown" }],
      budgets: {},
      categoryBudgets: {},
    }),
    false,
  );
  assert.equal(
    validData({
      expenses: [],
      budgets: { "2026-10": -1 },
      categoryBudgets: {},
    }),
    false,
  );
  assert.equal(
    validData({
      expenses: [],
      budgets: {},
      categoryBudgets: { "2026-10": { Unknown: 1000 } },
    }),
    false,
  );
  assert.equal(validData(null), false);
});

test("category variance is derived from actual expenses", () => {
  const data: BudgetData = {
    expenses: [
      example,
      { ...example, id: "b", description: "Groceries", amount: 750 },
      {
        ...example,
        id: "c",
        description: "Rent",
        amount: 180000,
        category: "Housing",
      },
      { ...example, id: "d", amount: 9999, date: "2026-09-30" },
    ],
    budgets: { "2026-10": 240000 },
    categoryBudgets: {
      "2026-10": { Housing: 190000, Food: 5000 },
    },
  };

  const summaries = categoryBudgetSummaries(data, "2026-10");
  const housing = summaries.find((entry) => entry.category === "Housing");
  const food = summaries.find((entry) => entry.category === "Food");

  assert.deepEqual(housing, {
    category: "Housing",
    budget: 190000,
    actual: 180000,
    variance: 10000,
    status: "saved",
  });
  assert.deepEqual(food, {
    category: "Food",
    budget: 5000,
    actual: 2000,
    variance: 3000,
    status: "saved",
  });
});

test("CSV quotes values and neutralises spreadsheet formulas", () => {
  const output = csv([
    { ...example, description: "=SUM(A1)" },
    { ...example, description: 'A "quoted", lunch' },
  ]);
  assert.ok(output.includes('"\'=SUM(A1)"'));
  assert.ok(output.includes('"A ""quoted"", lunch"'));
  assert.ok(output.includes("12.50"));
});
