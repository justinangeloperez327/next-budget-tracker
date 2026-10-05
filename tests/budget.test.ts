import test from "node:test";
import assert from "node:assert/strict";
import { total, validData, csv, type Expense } from "../src/lib/budget.ts";
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
test("rejects corrupt or fractional persisted values", () => {
  assert.ok(validData({ expenses: [example], budgets: { "2026-10": 50000 } }));
  assert.equal(
    validData({ expenses: [{ ...example, amount: 12.5 }], budgets: {} }),
    false,
  );
  assert.equal(
    validData({ expenses: [{ ...example, category: "Unknown" }], budgets: {} }),
    false,
  );
  assert.equal(validData({ expenses: [], budgets: { "2026-10": -1 } }), false);
  assert.equal(validData(null), false);
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
