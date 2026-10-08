import { validData, type BudgetData } from "./budget.ts";
import { billOccursInPeriod } from "./bills.ts";

const MAX_AMOUNT = 9_999_999_900;
const MAX_BUDGET_MONTHS = 600;
const MAX_CATEGORY_BUDGETS = 4_200;
const MAX_GOVERNMENT_ACCOUNTS = 12;
const MAX_GOVERNMENT_CONTRIBUTIONS = 1_200;
const MAX_MP2_ACCOUNTS = 24;
const MAX_MP2_DEPOSITS = 5_000;
const MAX_RECURRING_BILLS = 300;
const MAX_BILL_PAYMENTS = 5_000;
const MONTH_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validWorkspace(value: unknown): value is BudgetData {
  if (!validData(value) || value.expenses.length > 2000) return false;

  const categoryBudgets = value.categoryBudgets ?? {};
  const governmentAccounts = value.governmentAccounts ?? [];
  const governmentContributions = value.governmentContributions ?? [];
  const mp2Accounts = value.mp2Accounts ?? [];
  const mp2Deposits = value.mp2Deposits ?? [];
  const recurringBills = value.recurringBills ?? [];
  const billPayments = value.billPayments ?? [];
  const budgetMonths = new Set([
    ...Object.keys(value.budgets),
    ...Object.keys(categoryBudgets),
  ]);
  if (budgetMonths.size > MAX_BUDGET_MONTHS) return false;
  if (
    governmentAccounts.length > MAX_GOVERNMENT_ACCOUNTS ||
    governmentContributions.length > MAX_GOVERNMENT_CONTRIBUTIONS ||
    mp2Accounts.length > MAX_MP2_ACCOUNTS ||
    mp2Deposits.length > MAX_MP2_DEPOSITS ||
    recurringBills.length > MAX_RECURRING_BILLS ||
    billPayments.length > MAX_BILL_PAYMENTS
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

  const mp2AccountIds = new Set<string>();
  const mp2AccountNumbers = new Set<string>();
  for (const account of mp2Accounts) {
    const accountNumber = account.accountNumber?.trim();
    if (
      !UUID_PATTERN.test(account.id) ||
      mp2AccountIds.has(account.id) ||
      !account.name.trim() ||
      account.name.length > 80 ||
      (accountNumber !== undefined &&
        (!accountNumber || accountNumber.length > 40)) ||
      (accountNumber !== undefined && mp2AccountNumbers.has(accountNumber)) ||
      (account.monthlyTarget !== undefined &&
        account.monthlyTarget > MAX_AMOUNT)
    )
      return false;
    mp2AccountIds.add(account.id);
    if (accountNumber !== undefined) mp2AccountNumbers.add(accountNumber);
  }

  const mp2DepositIds = new Set<string>();
  for (const deposit of mp2Deposits) {
    if (
      !UUID_PATTERN.test(deposit.id) ||
      mp2DepositIds.has(deposit.id) ||
      !mp2AccountIds.has(deposit.accountId) ||
      deposit.amount > MAX_AMOUNT ||
      (deposit.referenceNumber !== undefined &&
        (deposit.referenceNumber.length > 80 ||
          !deposit.referenceNumber.trim())) ||
      (deposit.notes !== undefined &&
        (deposit.notes.length > 500 || !deposit.notes.trim()))
    )
      return false;
    mp2DepositIds.add(deposit.id);
  }

  const billIds = new Set<string>();
  for (const bill of recurringBills) {
    if (
      !UUID_PATTERN.test(bill.id) ||
      billIds.has(bill.id) ||
      bill.amount > MAX_AMOUNT ||
      !bill.name.trim() ||
      bill.name.length > 100 ||
      (bill.notes !== undefined &&
        (bill.notes.length > 500 || !bill.notes.trim()))
    )
      return false;
    billIds.add(bill.id);
  }

  const billPaymentIds = new Set<string>();
  const paidPeriods = new Set<string>();
  const billExpenseIds = new Set<string>();
  for (const payment of billPayments) {
    const periodKey = payment.billId + ":" + payment.period;
    if (
      !UUID_PATTERN.test(payment.id) ||
      billPaymentIds.has(payment.id) ||
      paidPeriods.has(periodKey) ||
      !billIds.has(payment.billId) ||
      !UUID_PATTERN.test(payment.expenseId) ||
      !ids.has(payment.expenseId) ||
      billExpenseIds.has(payment.expenseId) ||
      !billOccursInPeriod(
        recurringBills.find((bill) => bill.id === payment.billId)!,
        payment.period,
      ) ||
      payment.amount > MAX_AMOUNT ||
      (payment.referenceNumber !== undefined &&
        (payment.referenceNumber.length > 80 ||
          !payment.referenceNumber.trim())) ||
      (payment.notes !== undefined &&
        (payment.notes.length > 500 || !payment.notes.trim()))
    )
      return false;
    billPaymentIds.add(payment.id);
    paidPeriods.add(periodKey);
    billExpenseIds.add(payment.expenseId);
  }

  return true;
}
