import { validData, type BudgetData } from "./budget.ts";
import { billOccursInPeriod } from "./bills.ts";
import { remittanceExpenseAmount } from "./remittance.ts";

const MAX_AMOUNT = 9_999_999_900;
const MAX_BUDGET_MONTHS = 600;
const MAX_CATEGORY_BUDGETS = 4_200;
const MAX_GOVERNMENT_ACCOUNTS = 12;
const MAX_GOVERNMENT_CONTRIBUTIONS = 1_200;
const MAX_MP2_ACCOUNTS = 24;
const MAX_MP2_DEPOSITS = 5_000;
const MAX_RECURRING_BILLS = 300;
const MAX_BILL_PAYMENTS = 5_000;
const MAX_DEBTS = 500;
const MAX_DEBT_PAYMENTS = 5_000;
const MAX_SAVINGS_GOALS = 500;
const MAX_SAVINGS_DEPOSITS = 10_000;
const MAX_REMITTANCES = 10_000;
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
  const debts = value.debts ?? [];
  const debtPayments = value.debtPayments ?? [];
  const savingsGoals = value.savingsGoals ?? [];
  const savingsDeposits = value.savingsDeposits ?? [];
  const remittances = value.remittances ?? [];
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
    billPayments.length > MAX_BILL_PAYMENTS ||
    debts.length > MAX_DEBTS ||
    debtPayments.length > MAX_DEBT_PAYMENTS ||
    savingsGoals.length > MAX_SAVINGS_GOALS ||
    savingsDeposits.length > MAX_SAVINGS_DEPOSITS ||
    remittances.length > MAX_REMITTANCES
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
    const bill = recurringBills.find((entry) => entry.id === payment.billId);
    const expense = value.expenses.find(
      (entry) => entry.id === payment.expenseId,
    );
    if (
      !UUID_PATTERN.test(payment.id) ||
      billPaymentIds.has(payment.id) ||
      paidPeriods.has(periodKey) ||
      !bill ||
      !UUID_PATTERN.test(payment.expenseId) ||
      !expense ||
      billExpenseIds.has(payment.expenseId) ||
      !billOccursInPeriod(bill, payment.period) ||
      payment.amount > MAX_AMOUNT ||
      expense.amount !== payment.amount ||
      expense.date !== payment.paymentDate ||
      expense.category !== bill.category ||
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

  const debtIds = new Set<string>();
  for (const debt of debts) {
    if (
      !UUID_PATTERN.test(debt.id) ||
      debtIds.has(debt.id) ||
      debt.originalAmount > MAX_AMOUNT ||
      (debt.monthlyTarget !== undefined && debt.monthlyTarget > MAX_AMOUNT) ||
      !debt.name.trim() ||
      debt.name.length > 120 ||
      !debt.lender.trim() ||
      debt.lender.length > 120 ||
      (debt.notes !== undefined &&
        (debt.notes.length > 500 || !debt.notes.trim()))
    )
      return false;
    debtIds.add(debt.id);
  }

  const debtPaymentIds = new Set<string>();
  const debtExpenseIds = new Set<string>();
  const paidByDebt = new Map<string, number>();
  for (const payment of debtPayments) {
    const debt = debts.find((entry) => entry.id === payment.debtId);
    const expense = value.expenses.find(
      (entry) => entry.id === payment.expenseId,
    );
    if (
      !UUID_PATTERN.test(payment.id) ||
      debtPaymentIds.has(payment.id) ||
      !debt ||
      payment.amount > MAX_AMOUNT ||
      !UUID_PATTERN.test(payment.expenseId) ||
      !expense ||
      debtExpenseIds.has(payment.expenseId) ||
      billExpenseIds.has(payment.expenseId) ||
      expense.amount !== payment.amount ||
      expense.date !== payment.paymentDate ||
      expense.category !== debt.category ||
      (payment.referenceNumber !== undefined &&
        (payment.referenceNumber.length > 80 ||
          !payment.referenceNumber.trim())) ||
      (payment.notes !== undefined &&
        (payment.notes.length > 500 || !payment.notes.trim()))
    )
      return false;
    const nextPaid = (paidByDebt.get(payment.debtId) ?? 0) + payment.amount;
    if (nextPaid > debt.originalAmount) return false;
    paidByDebt.set(payment.debtId, nextPaid);
    debtPaymentIds.add(payment.id);
    debtExpenseIds.add(payment.expenseId);
  }

  const savingsGoalIds = new Set<string>();
  for (const goal of savingsGoals) {
    if (
      !UUID_PATTERN.test(goal.id) ||
      savingsGoalIds.has(goal.id) ||
      goal.targetAmount > MAX_AMOUNT ||
      (goal.monthlyTarget !== undefined && goal.monthlyTarget > MAX_AMOUNT) ||
      !goal.name.trim() ||
      goal.name.length > 120 ||
      (goal.destination !== undefined &&
        (goal.destination.length > 120 || !goal.destination.trim())) ||
      (goal.notes !== undefined &&
        (goal.notes.length > 500 || !goal.notes.trim()))
    )
      return false;
    savingsGoalIds.add(goal.id);
  }

  const savingsDepositIds = new Set<string>();
  const savedByGoal = new Map<string, number>();
  for (const deposit of savingsDeposits) {
    const goal = savingsGoals.find((entry) => entry.id === deposit.goalId);
    if (
      !UUID_PATTERN.test(deposit.id) ||
      savingsDepositIds.has(deposit.id) ||
      !goal ||
      deposit.amount > MAX_AMOUNT ||
      (deposit.referenceNumber !== undefined &&
        (deposit.referenceNumber.length > 80 ||
          !deposit.referenceNumber.trim())) ||
      (deposit.notes !== undefined &&
        (deposit.notes.length > 500 || !deposit.notes.trim()))
    )
      return false;
    const nextSaved = (savedByGoal.get(deposit.goalId) ?? 0) + deposit.amount;
    if (nextSaved > goal.targetAmount) return false;
    savedByGoal.set(deposit.goalId, nextSaved);
    savingsDepositIds.add(deposit.id);
  }

  const remittanceIds = new Set<string>();
  const remittanceExpenseIds = new Set<string>();
  for (const remittance of remittances) {
    const expenseAmount = remittanceExpenseAmount(remittance);
    const expense = remittance.expenseId
      ? value.expenses.find((entry) => entry.id === remittance.expenseId)
      : undefined;
    if (
      !UUID_PATTERN.test(remittance.id) ||
      remittanceIds.has(remittance.id) ||
      remittance.sentAmount > MAX_AMOUNT ||
      remittance.feeAmount > MAX_AMOUNT ||
      remittance.sentAmount + remittance.feeAmount > MAX_AMOUNT ||
      (remittance.receivedAmount !== undefined &&
        remittance.receivedAmount > MAX_AMOUNT) ||
      !remittance.recipient.trim() ||
      remittance.recipient.length > 120 ||
      (remittance.provider !== undefined &&
        (remittance.provider.length > 120 || !remittance.provider.trim())) ||
      (remittance.referenceNumber !== undefined &&
        (remittance.referenceNumber.length > 80 ||
          !remittance.referenceNumber.trim())) ||
      (remittance.notes !== undefined &&
        (remittance.notes.length > 500 || !remittance.notes.trim())) ||
      (expenseAmount > 0 &&
        (!remittance.expenseId ||
          !UUID_PATTERN.test(remittance.expenseId) ||
          !expense ||
          remittanceExpenseIds.has(remittance.expenseId) ||
          billExpenseIds.has(remittance.expenseId) ||
          debtExpenseIds.has(remittance.expenseId) ||
          expense.amount !== expenseAmount ||
          expense.date !== remittance.transferDate ||
          expense.category !== remittance.category)) ||
      (expenseAmount === 0 && remittance.expenseId !== undefined)
    )
      return false;
    remittanceIds.add(remittance.id);
    if (remittance.expenseId) remittanceExpenseIds.add(remittance.expenseId);
  }

  return true;
}
