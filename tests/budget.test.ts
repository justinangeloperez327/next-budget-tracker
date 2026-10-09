import test from "node:test";
import assert from "node:assert/strict";
import {
  budgetHistoryMonths,
  categoryBudgetSummaries,
  historicalBudgetAnalysis,
  monthlyBudgetReport,
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

test("monthly report separates net result from category variances", () => {
  const data: BudgetData = {
    expenses: [
      {
        ...example,
        id: "housing",
        description: "Rent",
        amount: 14000,
        category: "Housing",
      },
      { ...example, id: "food", amount: 7000, category: "Food" },
      { ...example, id: "transport", amount: 1000, category: "Transport" },
    ],
    budgets: { "2026-10": 30000 },
    categoryBudgets: {
      "2026-10": { Housing: 15000, Food: 5000 },
    },
  };

  const report = monthlyBudgetReport(data, "2026-10");

  assert.equal(report.budget, 30000);
  assert.equal(report.actual, 22000);
  assert.equal(report.variance, 8000);
  assert.equal(report.saved, 8000);
  assert.equal(report.overspent, 0);
  assert.equal(report.savingsRate, (8000 / 30000) * 100);
  assert.equal(report.allocated, 20000);
  assert.equal(report.unallocated, 10000);
  assert.equal(report.categorySaved, 1000);
  assert.equal(report.categoryOverspent, 3000);
});

test("monthly report records an over-budget month without negative savings", () => {
  const report = monthlyBudgetReport(
    {
      expenses: [{ ...example, amount: 12000 }],
      budgets: { "2026-10": 10000 },
      categoryBudgets: { "2026-10": { Food: 10000 } },
    },
    "2026-10",
  );

  assert.equal(report.saved, 0);
  assert.equal(report.overspent, 2000);
  assert.equal(report.savingsRate, 0);
  assert.equal(report.budgetUsedRate, 120);
});

test("history includes budget, category-only, and expense-only months", () => {
  const data: BudgetData = {
    expenses: [
      { ...example, id: "sep", date: "2026-09-12" },
      { ...example, id: "nov", date: "2026-11-01" },
    ],
    budgets: { "2026-08": 10000 },
    categoryBudgets: { "2026-10": { Food: 5000 } },
  };

  assert.deepEqual(budgetHistoryMonths(data), [
    "2026-08",
    "2026-09",
    "2026-10",
    "2026-11",
  ]);
});

test("historical analysis aggregates monthly and category trends", () => {
  const data: BudgetData = {
    expenses: [
      { ...example, id: "sep-food", date: "2026-09-05", amount: 6000 },
      {
        ...example,
        id: "sep-home",
        date: "2026-09-10",
        amount: 9000,
        category: "Housing",
      },
      { ...example, id: "oct-food", date: "2026-10-05", amount: 4000 },
      {
        ...example,
        id: "oct-home",
        date: "2026-10-10",
        amount: 12000,
        category: "Housing",
      },
    ],
    budgets: { "2026-09": 20000, "2026-10": 15000 },
    categoryBudgets: {
      "2026-09": { Food: 5000, Housing: 10000 },
      "2026-10": { Food: 5000, Housing: 10000 },
    },
  };

  const analysis = historicalBudgetAnalysis(data);

  assert.deepEqual(analysis.months, ["2026-09", "2026-10"]);
  assert.equal(analysis.totalBudget, 35000);
  assert.equal(analysis.totalActual, 31000);
  assert.equal(analysis.netVariance, 4000);
  assert.equal(analysis.totalSaved, 5000);
  assert.equal(analysis.totalOverspent, 1000);
  assert.equal(analysis.savedMonths, 1);
  assert.equal(analysis.overspentMonths, 1);
  assert.equal(analysis.onBudgetMonths, 0);

  const food = analysis.categoryPerformance.find(
    (entry) => entry.category === "Food",
  );
  const housing = analysis.categoryPerformance.find(
    (entry) => entry.category === "Housing",
  );

  assert.deepEqual(food, {
    category: "Food",
    budget: 10000,
    actual: 10000,
    variance: 0,
    activeMonths: 2,
    savedMonths: 1,
    overspentMonths: 1,
  });
  assert.deepEqual(housing, {
    category: "Housing",
    budget: 20000,
    actual: 21000,
    variance: -1000,
    activeMonths: 2,
    savedMonths: 1,
    overspentMonths: 1,
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
