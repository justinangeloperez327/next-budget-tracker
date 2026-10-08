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
export type CategoryBudget = Partial<Record<Category, number>>;
export type BudgetData = {
  expenses: Expense[];
  budgets: Record<string, number>;
  categoryBudgets?: Record<string, CategoryBudget>;
};
export type BudgetVarianceStatus = "saved" | "on-budget" | "overspent";
export type CategoryBudgetSummary = {
  category: Category;
  budget: number;
  actual: number;
  variance: number;
  status: BudgetVarianceStatus;
};
export type MonthlyBudgetReport = {
  month: string;
  budget: number;
  actual: number;
  variance: number;
  saved: number;
  overspent: number;
  savingsRate: number;
  budgetUsedRate: number;
  allocated: number;
  unallocated: number;
  categorySaved: number;
  categoryOverspent: number;
  categorySummaries: CategoryBudgetSummary[];
};

export const emptyData: BudgetData = {
  expenses: [],
  budgets: {},
  categoryBudgets: {},
};

function validCategoryBudgets(value: unknown) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([month, allocations]) =>
      /^\d{4}-\d{2}$/.test(month) &&
      !!allocations &&
      typeof allocations === "object" &&
      !Array.isArray(allocations) &&
      Object.entries(allocations).every(
        ([category, amount]) =>
          categories.includes(category as Category) &&
          Number.isSafeInteger(amount) &&
          Number(amount) >= 0,
      ),
  );
}

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
    ) &&
    validCategoryBudgets(d.categoryBudgets)
  );
}

export function total(expenses: Expense[]) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function categoryBudgetSummaries(
  data: BudgetData,
  month: string,
): CategoryBudgetSummary[] {
  const allocations = data.categoryBudgets?.[month] ?? {};
  const actuals = new Map<Category, number>(
    categories.map((category) => [category, 0]),
  );

  for (const expense of data.expenses) {
    if (!expense.date.startsWith(month)) continue;
    actuals.set(
      expense.category,
      (actuals.get(expense.category) ?? 0) + expense.amount,
    );
  }

  return categories.map((category) => {
    const budget = allocations[category] ?? 0;
    const actual = actuals.get(category) ?? 0;
    const variance = budget - actual;
    return {
      category,
      budget,
      actual,
      variance,
      status:
        variance > 0 ? "saved" : variance < 0 ? "overspent" : "on-budget",
    };
  });
}

export function monthlyBudgetReport(
  data: BudgetData,
  month: string,
): MonthlyBudgetReport {
  const budget = data.budgets[month] ?? 0;
  const actual = total(
    data.expenses.filter((expense) => expense.date.startsWith(month)),
  );
  const variance = budget - actual;
  const saved = Math.max(variance, 0);
  const overspent = Math.max(-variance, 0);
  const categorySummaries = categoryBudgetSummaries(data, month);
  const allocated = categorySummaries.reduce(
    (sum, entry) => sum + entry.budget,
    0,
  );
  const categorySaved = categorySummaries.reduce(
    (sum, entry) => sum + Math.max(entry.variance, 0),
    0,
  );
  const categoryOverspent = categorySummaries.reduce(
    (sum, entry) => sum + Math.max(-entry.variance, 0),
    0,
  );

  return {
    month,
    budget,
    actual,
    variance,
    saved,
    overspent,
    savingsRate: budget > 0 ? (saved / budget) * 100 : 0,
    budgetUsedRate: budget > 0 ? (actual / budget) * 100 : 0,
    allocated,
    unallocated: budget - allocated,
    categorySaved,
    categoryOverspent,
    categorySummaries,
  };
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
