export const categories = [
  "Housing",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
] as const;
export type Category = (typeof categories)[number];
export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
};
export type BudgetData = {
  expenses: Expense[];
  budgets: Record<string, number>;
};
export const emptyData: BudgetData = { expenses: [], budgets: {} };
export function validData(data: unknown): data is BudgetData {
  if (!data || typeof data !== "object") return false;
  const d = data as BudgetData;
  return (
    Array.isArray(d.expenses) &&
    d.expenses.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.description === "string" &&
        Number.isSafeInteger(e.amount) &&
        e.amount > 0 &&
        categories.includes(e.category) &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date),
    ) &&
    !!d.budgets &&
    typeof d.budgets === "object" &&
    !Array.isArray(d.budgets) &&
    Object.entries(d.budgets).every(
      ([k, v]) => /^\d{4}-\d{2}$/.test(k) && Number.isSafeInteger(v) && v >= 0,
    )
  );
}
export function total(expenses: Expense[]) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(cents / 100);
}
export function csv(expenses: Expense[]) {
  const escape = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  const safe = (s: string) => escape(/^[=+@\-\t\r]/.test(s) ? "'" + s : s);
  return [
    "Date,Description,Category,Amount (AED)",
    ...expenses.map((e) =>
      [
        escape(e.date),
        safe(e.description),
        escape(e.category),
        (e.amount / 100).toFixed(2),
      ].join(","),
    ),
  ].join("\r\n");
}
