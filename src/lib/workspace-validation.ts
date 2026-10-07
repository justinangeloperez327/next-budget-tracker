import { validData, type BudgetData } from "./budget.ts";

const MAX_AMOUNT = 9_999_999_900;
const MAX_BUDGET_MONTHS = 600;
const MAX_CATEGORY_BUDGETS = 4_200;
const MONTH_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;

export function validWorkspace(value: unknown): value is BudgetData {
  if (!validData(value) || value.expenses.length > 2000) return false;

  const categoryBudgets = value.categoryBudgets ?? {};
  const budgetMonths = new Set([
    ...Object.keys(value.budgets),
    ...Object.keys(categoryBudgets),
  ]);
  if (budgetMonths.size > MAX_BUDGET_MONTHS) return false;

  const ids = new Set<string>();
  for (const e of value.expenses) {
    if (
      !/^[a-f0-9-]{36}$/i.test(e.id) ||
      ids.has(e.id) ||
      e.amount > MAX_AMOUNT ||
      !e.description.trim() ||
      e.description.length > 120
    )
      return false;
    ids.add(e.id);
    const date = new Date(e.date + "T00:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== e.date
    )
      return false;
  }

  if (
    !Object.entries(value.budgets).every(
      ([month, amount]) => MONTH_PATTERN.test(month) && amount <= MAX_AMOUNT,
    )
  )
    return false;

  let allocationCount = 0;
  for (const [month, allocations] of Object.entries(categoryBudgets)) {
    if (!MONTH_PATTERN.test(month)) return false;
    for (const amount of Object.values(allocations)) {
      allocationCount += 1;
      if (amount === undefined || amount > MAX_AMOUNT) return false;
    }
  }

  return allocationCount <= MAX_CATEGORY_BUDGETS;
}
