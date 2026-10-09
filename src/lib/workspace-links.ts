import type { BudgetData } from "./budget.ts";

export type ManagedExpenseSource =
  | "Bill payment"
  | "Debt payment"
  | "Remittance";

export function managedExpenseSources(data: BudgetData) {
  const sources = new Map<string, ManagedExpenseSource>();

  for (const payment of data.billPayments ?? [])
    sources.set(payment.expenseId, "Bill payment");
  for (const payment of data.debtPayments ?? [])
    sources.set(payment.expenseId, "Debt payment");
  for (const remittance of data.remittances ?? [])
    if (remittance.expenseId)
      sources.set(remittance.expenseId, "Remittance");

  return sources;
}

export function managedExpenseIds(data: BudgetData) {
  return new Set(managedExpenseSources(data).keys());
}
