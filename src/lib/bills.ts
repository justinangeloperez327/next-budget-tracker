import type { Category } from "./budget.ts";

export const billFrequencies = ["Monthly", "Quarterly", "Yearly"] as const;
export type BillFrequency = (typeof billFrequencies)[number];

export type RecurringBill = {
  id: string;
  name: string;
  category: Category;
  amount: number;
  frequency: BillFrequency;
  dueDay: number;
  startMonth: string;
  endMonth?: string;
  active: boolean;
  notes?: string;
};

export type BillPayment = {
  id: string;
  billId: string;
  period: string;
  amount: number;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
};

export type BillOccurrenceStatus =
  | "Paid"
  | "Overdue"
  | "Due soon"
  | "Upcoming";

export type BillOccurrence = {
  bill: RecurringBill;
  period: string;
  dueDate: string;
  status: BillOccurrenceStatus;
  payment?: BillPayment;
};

const MONTH_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validBillsData(billsValue: unknown, paymentsValue: unknown) {
  if (
    billsValue !== undefined &&
    (!Array.isArray(billsValue) ||
      !billsValue.every((bill) => {
        if (!bill || typeof bill !== "object") return false;
        const value = bill as RecurringBill;
        return (
          typeof value.id === "string" &&
          typeof value.name === "string" &&
          !!value.name.trim() &&
          value.name.length <= 100 &&
          typeof value.category === "string" &&
          Number.isSafeInteger(value.amount) &&
          value.amount > 0 &&
          billFrequencies.includes(value.frequency) &&
          Number.isInteger(value.dueDay) &&
          value.dueDay >= 1 &&
          value.dueDay <= 31 &&
          MONTH_PATTERN.test(value.startMonth) &&
          (value.endMonth === undefined ||
            (MONTH_PATTERN.test(value.endMonth) &&
              value.endMonth >= value.startMonth)) &&
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
        const value = payment as BillPayment;
        return (
          typeof value.id === "string" &&
          typeof value.billId === "string" &&
          MONTH_PATTERN.test(value.period) &&
          Number.isSafeInteger(value.amount) &&
          value.amount > 0 &&
          typeof value.paymentDate === "string" &&
          validDate(value.paymentDate) &&
          (value.referenceNumber === undefined ||
            typeof value.referenceNumber === "string") &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  return true;
}

function monthIndex(period: string) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

export function billOccursInPeriod(bill: RecurringBill, period: string) {
  if (!MONTH_PATTERN.test(period) || period < bill.startMonth) return false;
  if (bill.endMonth && period > bill.endMonth) return false;
  const difference = monthIndex(period) - monthIndex(bill.startMonth);
  const interval =
    bill.frequency === "Monthly" ? 1 : bill.frequency === "Quarterly" ? 3 : 12;
  return difference % interval === 0;
}

export function billDueDate(bill: RecurringBill, period: string) {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(Math.min(bill.dueDay, lastDay)).padStart(2, "0"),
  ].join("-");
}

export function billOccurrencesForPeriod(
  bills: RecurringBill[],
  payments: BillPayment[],
  period: string,
  asOfDate: string,
): BillOccurrence[] {
  const paymentByBill = new Map(
    payments
      .filter((payment) => payment.period === period)
      .map((payment) => [payment.billId, payment]),
  );
  const asOf = new Date(asOfDate + "T00:00:00Z");

  return bills
    .filter((bill) => bill.active && billOccursInPeriod(bill, period))
    .map((bill) => {
      const dueDate = billDueDate(bill, period);
      const payment = paymentByBill.get(bill.id);
      let status: BillOccurrenceStatus = "Upcoming";
      if (payment) status = "Paid";
      else if (dueDate < asOfDate) status = "Overdue";
      else {
        const due = new Date(dueDate + "T00:00:00Z");
        const days = Math.ceil((due.getTime() - asOf.getTime()) / 86_400_000);
        if (days <= 7) status = "Due soon";
      }
      return {
        bill,
        period,
        dueDate,
        status,
        ...(payment ? { payment } : {}),
      };
    })
    .toSorted(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) || a.bill.name.localeCompare(b.bill.name),
    );
}

export function billDashboardSnapshot(
  bills: RecurringBill[],
  payments: BillPayment[],
  asOfDate: string,
) {
  const period = asOfDate.slice(0, 7);
  const occurrences = billOccurrencesForPeriod(
    bills,
    payments,
    period,
    asOfDate,
  );
  return {
    period,
    occurrences,
    scheduled: occurrences.reduce((sum, entry) => sum + entry.bill.amount, 0),
    paid: occurrences.reduce(
      (sum, entry) => sum + (entry.payment?.amount ?? 0),
      0,
    ),
    outstanding: occurrences.reduce(
      (sum, entry) => sum + (entry.payment ? 0 : entry.bill.amount),
      0,
    ),
    overdue: occurrences.filter((entry) => entry.status === "Overdue").length,
    dueSoon: occurrences.filter((entry) => entry.status === "Due soon").length,
    paidCount: occurrences.filter((entry) => entry.status === "Paid").length,
  };
}

export function billHistoryMonths(
  bills: RecurringBill[],
  payments: BillPayment[],
  currentPeriod: string,
) {
  return [
    ...new Set([
      currentPeriod,
      ...bills.map((bill) => bill.startMonth),
      ...bills.flatMap((bill) => (bill.endMonth ? [bill.endMonth] : [])),
      ...payments.map((payment) => payment.period),
    ]),
  ].toSorted().toReversed();
}
