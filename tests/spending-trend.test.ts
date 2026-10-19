import test from "node:test";
import assert from "node:assert/strict";
import { monthlySpendingTrend } from "../src/lib/spending-trend.ts";
import type { Expense } from "../src/lib/budget.ts";

function expense(date: string, amount: number): Expense {
  return {
    id: `${date}-${amount}`,
    description: "Expense",
    date,
    amount,
    category: "Food",
  };
}

test("daily trend sums same-day expenses in cents, fills gaps, and excludes other months", () => {
  const source = [
    expense("2026-10-03", 100),
    expense("2026-10-01", 1250),
    expense("2026-09-30", 9999),
    expense("2026-11-01", 9999),
    expense("2026-10-03", 250),
  ];
  const original = structuredClone(source);
  const days = monthlySpendingTrend(source, "2026-10");
  assert.equal(days.length, 31);
  assert.deepEqual(days[0], {
    day: 1,
    date: "2026-10-01",
    amount: 1250,
    cumulative: 1250,
  });
  assert.equal(days[1].amount, 0);
  assert.equal(days[1].cumulative, 1250);
  assert.equal(days[2].amount, 350);
  assert.equal(days.at(-1)?.cumulative, 1600);
  assert.deepEqual(source, original);
});

test("trend respects leap years, short months, and year boundaries", () => {
  assert.equal(monthlySpendingTrend([], "2024-02").length, 29);
  assert.equal(monthlySpendingTrend([], "2026-02").length, 28);
  assert.equal(monthlySpendingTrend([], "2026-04").length, 30);
  const december = monthlySpendingTrend(
    [expense("2026-12-31", 1), expense("2027-01-01", 2)],
    "2026-12",
  );
  assert.equal(december.at(-1)?.cumulative, 1);
});

test("empty months have zero totals and invalid months return no chart data", () => {
  assert.ok(
    monthlySpendingTrend([], "2026-10").every(
      (entry) => entry.amount === 0 && entry.cumulative === 0,
    ),
  );
  for (const month of ["", "2026-00", "2026-13", "2026-2", "invalid"])
    assert.deepEqual(monthlySpendingTrend([], month), []);
});
