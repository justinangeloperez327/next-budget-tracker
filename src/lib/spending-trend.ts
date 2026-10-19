import type { Expense } from "./budget.ts";

export type SpendingDay = {
  day: number;
  date: string;
  amount: number;
  cumulative: number;
};

export function monthlySpendingTrend(
  expenses: Expense[],
  month: string,
): SpendingDay[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const end = new Date(`${month}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const days = Array.from({ length: end.getUTCDate() }, (_, index) => ({
    day: index + 1,
    date: `${month}-${String(index + 1).padStart(2, "0")}`,
    amount: 0,
    cumulative: 0,
  }));

  for (const expense of expenses) {
    if (expense.date.slice(0, 7) !== month) continue;
    const entry = days[Number(expense.date.slice(8, 10)) - 1];
    if (entry?.date === expense.date) entry.amount += expense.amount;
  }
  let cumulative = 0;
  for (const entry of days) {
    cumulative += entry.amount;
    entry.cumulative = cumulative;
  }
  return days;
}
