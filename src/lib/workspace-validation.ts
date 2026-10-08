import { validData, type BudgetData } from "./budget.ts";

const MAX_AMOUNT = 9_999_999_900;
const MAX_BUDGET_MONTHS = 600;
const MAX_CATEGORY_BUDGETS = 4_200;
const MAX_GOVERNMENT_ACCOUNTS = 12;
const MAX_GOVERNMENT_CONTRIBUTIONS = 1_200;
const MONTH_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validWorkspace(value: unknown): value is BudgetData {
  if (!validData(value) || value.expenses.length > 2000) return false;

  const categoryBudgets = value.categoryBudgets ?? {};
  const governmentAccounts = value.governmentAccounts ?? [];
  const governmentContributions = value.governmentContributions ?? [];
  const budgetMonths = new Set([
    ...Object.keys(value.budgets),
    ...Object.keys(categoryBudgets),
  ]);
  if (budgetMonths.size > MAX_BUDGET_MONTHS) return false;
  if (
    governmentAccounts.length > MAX_GOVERNMENT_ACCOUNTS ||
    governmentContributions.length > MAX_GOVERNMENT_CONTRIBUTIONS
  )
    return false;

  const ids = new Set<string>();
  for (const e of value.expenses) {
    if (
      !UUID_PATTERN.test(e.id) ||
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
  if (allocationCount > MAX_CATEGORY_BUDGETS) return false;

  const accountIds = new Set<string>();
  const providers = new Set<string>();
  for (const account of governmentAccounts) {
    if (
      !UUID_PATTERN.test(account.id) ||
      accountIds.has(account.id) ||
      providers.has(account.provider) ||
      (account.accountIdentifier !== undefined &&
        (account.accountIdentifier.length > 40 ||
          !account.accountIdentifier.trim())) ||
      (account.monthlyTarget !== undefined &&
        account.monthlyTarget > MAX_AMOUNT)
    )
      return false;
    accountIds.add(account.id);
    providers.add(account.provider);
  }

  const contributionIds = new Set<string>();
  const contributionPeriods = new Set<string>();
  for (const contribution of governmentContributions) {
    const periodKey = contribution.accountId + ":" + contribution.period;
    if (
      !UUID_PATTERN.test(contribution.id) ||
      contributionIds.has(contribution.id) ||
      contributionPeriods.has(periodKey) ||
      !accountIds.has(contribution.accountId) ||
      contribution.amount > MAX_AMOUNT ||
      (contribution.referenceNumber !== undefined &&
        (contribution.referenceNumber.length > 80 ||
          !contribution.referenceNumber.trim())) ||
      (contribution.notes !== undefined &&
        (contribution.notes.length > 500 || !contribution.notes.trim())) ||
      (contribution.status === "Paid" && !contribution.paymentDate)
    )
      return false;
    contributionIds.add(contribution.id);
    contributionPeriods.add(periodKey);
  }

  return true;
}
