import { validData, type BudgetData } from "./budget.ts";
const MAX_AMOUNT = 9_999_999_900;
export function validWorkspace(value: unknown): value is BudgetData {
  if (
    !validData(value) ||
    value.expenses.length > 2000 ||
    Object.keys(value.budgets).length > 600
  )
    return false;
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
  return Object.entries(value.budgets).every(
    ([month, amount]) =>
      /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month) && amount <= MAX_AMOUNT,
  );
}
