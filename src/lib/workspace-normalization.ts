import type { BudgetData, Expense } from "./budget.ts";
import { remittanceExpenseAmount } from "./remittance.ts";

export function normalizeManagedExpenseLinks(data: BudgetData): BudgetData {
  const expenses = new Map<string, Expense>(
    data.expenses.map((expense) => [expense.id, expense]),
  );

  const updateExpense = (
    expenseId: string,
    changes: Pick<Expense, "amount" | "category" | "date">,
  ) => {
    const expense = expenses.get(expenseId);
    if (!expense) return;
    expenses.set(expenseId, { ...expense, ...changes });
  };

  const bills = new Map(
    (data.recurringBills ?? []).map((bill) => [bill.id, bill]),
  );
  for (const payment of data.billPayments ?? []) {
    const bill = bills.get(payment.billId);
    if (!bill) continue;
    updateExpense(payment.expenseId, {
      amount: payment.amount,
      category: bill.category,
      date: payment.paymentDate,
    });
  }

  const debts = new Map((data.debts ?? []).map((debt) => [debt.id, debt]));
  for (const payment of data.debtPayments ?? []) {
    const debt = debts.get(payment.debtId);
    if (!debt) continue;
    updateExpense(payment.expenseId, {
      amount: payment.amount,
      category: debt.category,
      date: payment.paymentDate,
    });
  }

  for (const remittance of data.remittances ?? []) {
    if (!remittance.expenseId) continue;
    const amount = remittanceExpenseAmount(remittance);
    if (amount <= 0) continue;
    updateExpense(remittance.expenseId, {
      amount,
      category: remittance.category as Expense["category"],
      date: remittance.transferDate,
    });
  }

  return {
    ...data,
    expenses: data.expenses.map(
      (expense) => expenses.get(expense.id) ?? expense,
    ),
  };
}
