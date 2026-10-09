import type { Category } from "./budget.ts";

export type Debt = {
  id: string;
  name: string;
  lender: string;
  originalAmount: number;
  category: Category;
  startDate: string;
  dueDate?: string;
  monthlyTarget?: number;
  active: boolean;
  notes?: string;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  expenseId: string;
  referenceNumber?: string;
  notes?: string;
};

export type DebtStatus = "Paid off" | "Overdue" | "Active" | "Inactive";

export type DebtSnapshot = {
  debt: Debt;
  totalPaid: number;
  remaining: number;
  progressRate: number;
  status: DebtStatus;
  lastPayment?: DebtPayment;
  currentMonthPaid: number;
  monthlyTargetProgress: number;
};

const DATE_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validDebtData(debtsValue: unknown, paymentsValue: unknown) {
  if (
    debtsValue !== undefined &&
    (!Array.isArray(debtsValue) ||
      !debtsValue.every((debt) => {
        if (!debt || typeof debt !== "object") return false;
        const value = debt as Debt;
        return (
          typeof value.id === "string" &&
          typeof value.name === "string" &&
          !!value.name.trim() &&
          value.name.length <= 120 &&
          typeof value.lender === "string" &&
          !!value.lender.trim() &&
          value.lender.length <= 120 &&
          Number.isSafeInteger(value.originalAmount) &&
          value.originalAmount > 0 &&
          typeof value.category === "string" &&
          typeof value.startDate === "string" &&
          validDate(value.startDate) &&
          (value.dueDate === undefined ||
            (typeof value.dueDate === "string" &&
              validDate(value.dueDate) &&
              value.dueDate >= value.startDate)) &&
          (value.monthlyTarget === undefined ||
            (Number.isSafeInteger(value.monthlyTarget) &&
              value.monthlyTarget > 0)) &&
          typeof value.active === "boolean" &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  if (
    paymentsValue !== undefined &&
    (!Array.isArray(paymentsValue) ||
      !paymentsValue.every((payment) => {
        if (!payment || typeof payment !== "object") return false;
        const value = payment as DebtPayment;
        return (
          typeof value.id === "string" &&
          typeof value.debtId === "string" &&
          Number.isSafeInteger(value.amount) &&
          value.amount > 0 &&
          typeof value.paymentDate === "string" &&
          validDate(value.paymentDate) &&
          typeof value.expenseId === "string" &&
          !!value.expenseId &&
          (value.referenceNumber === undefined ||
            typeof value.referenceNumber === "string") &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  return true;
}

export function debtSnapshot(
  debt: Debt,
  payments: DebtPayment[],
  asOfDate: string,
): DebtSnapshot {
  const relevant = payments
    .filter((payment) => payment.debtId === debt.id)
    .toSorted(
      (a, b) =>
        b.paymentDate.localeCompare(a.paymentDate) || b.id.localeCompare(a.id),
    );
  const totalPaid = relevant.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, debt.originalAmount - totalPaid);
  const currentMonth = asOfDate.slice(0, 7);
  const currentMonthPaid = relevant
    .filter((payment) => payment.paymentDate.startsWith(currentMonth))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const status: DebtStatus =
    remaining === 0
      ? "Paid off"
      : !debt.active
        ? "Inactive"
        : debt.dueDate && debt.dueDate < asOfDate
          ? "Overdue"
          : "Active";

  return {
    debt,
    totalPaid,
    remaining,
    progressRate:
      debt.originalAmount > 0
        ? Math.min(100, (totalPaid / debt.originalAmount) * 100)
        : 0,
    status,
    ...(relevant[0] ? { lastPayment: relevant[0] } : {}),
    currentMonthPaid,
    monthlyTargetProgress:
      debt.monthlyTarget && debt.monthlyTarget > 0
        ? (currentMonthPaid / debt.monthlyTarget) * 100
        : 0,
  };
}

export function debtDashboardSnapshot(
  debts: Debt[],
  payments: DebtPayment[],
  asOfDate: string,
) {
  const snapshots = debts.map((debt) => debtSnapshot(debt, payments, asOfDate));
  return {
    snapshots,
    originalDebt: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.debt.originalAmount,
      0,
    ),
    totalPaid: snapshots.reduce((sum, snapshot) => sum + snapshot.totalPaid, 0),
    remaining: snapshots.reduce((sum, snapshot) => sum + snapshot.remaining, 0),
    activeCount: snapshots.filter(
      (snapshot) =>
        snapshot.status === "Active" || snapshot.status === "Overdue",
    ).length,
    overdueCount: snapshots.filter((snapshot) => snapshot.status === "Overdue")
      .length,
    paidOffCount: snapshots.filter((snapshot) => snapshot.status === "Paid off")
      .length,
  };
}
