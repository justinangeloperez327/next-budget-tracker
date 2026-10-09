import test from "node:test";
import assert from "node:assert/strict";
import {
  billDashboardSnapshot,
  billDueDate,
  billOccursInPeriod,
  billOccurrencesForPeriod,
  validBillsData,
  type BillPayment,
  type RecurringBill,
} from "../src/lib/bills.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const rent: RecurringBill = {
  id: "22222222-aaaa-4222-8222-222222222222",
  name: "Rent",
  category: "Housing",
  amount: 190000,
  frequency: "Monthly",
  dueDay: 1,
  startMonth: "2026-01",
  active: true,
};

const internet: RecurringBill = {
  id: "33333333-aaaa-4333-8333-333333333333",
  name: "Internet",
  category: "Housing",
  amount: 30000,
  frequency: "Quarterly",
  dueDay: 31,
  startMonth: "2026-01",
  active: true,
};

const rentPayment: BillPayment = {
  id: "44444444-aaaa-4444-8444-444444444444",
  billId: rent.id,
  period: "2026-10",
  amount: 190000,
  paymentDate: "2026-10-01",
  expenseId: "45454545-aaaa-4454-8454-454545454545",
  referenceNumber: "RENT-OCT",
};

test("bill recurrence follows monthly, quarterly, and yearly cadence", () => {
  assert.equal(billOccursInPeriod(rent, "2026-10"), true);
  assert.equal(billOccursInPeriod(internet, "2026-10"), true);
  assert.equal(billOccursInPeriod(internet, "2026-11"), false);

  const yearly: RecurringBill = {
    ...internet,
    id: "55555555-aaaa-4555-8555-555555555555",
    frequency: "Yearly",
    startMonth: "2026-04",
  };
  assert.equal(billOccursInPeriod(yearly, "2027-04"), true);
  assert.equal(billOccursInPeriod(yearly, "2027-05"), false);
});

test("bill due date clamps to the final day of short months", () => {
  assert.equal(billDueDate(internet, "2026-02"), "2026-02-28");
  assert.equal(billDueDate(internet, "2028-02"), "2028-02-29");
});

test("bill occurrences distinguish paid, overdue, due-soon, and upcoming", () => {
  const bills: RecurringBill[] = [
    rent,
    { ...rent, id: "66666666-aaaa-4666-8666-666666666666", name: "Power", dueDay: 7 },
    { ...rent, id: "77777777-aaaa-4777-8777-777777777777", name: "Phone", dueDay: 12 },
    { ...rent, id: "88888888-aaaa-4888-8888-888888888888", name: "Insurance", dueDay: 25 },
  ];
  const history = billOccurrencesForPeriod(
    bills,
    [rentPayment],
    "2026-10",
    "2026-10-08",
  );

  assert.equal(history.find((entry) => entry.bill.name === "Rent")?.status, "Paid");
  assert.equal(history.find((entry) => entry.bill.name === "Power")?.status, "Overdue");
  assert.equal(history.find((entry) => entry.bill.name === "Phone")?.status, "Due soon");
  assert.equal(history.find((entry) => entry.bill.name === "Insurance")?.status, "Upcoming");
});

test("bill dashboard totals planned, paid, and outstanding amounts", () => {
  const snapshot = billDashboardSnapshot(
    [rent, { ...rent, id: "99999999-aaaa-4999-8999-999999999999", name: "Power", amount: 40000, dueDay: 7 }],
    [rentPayment],
    "2026-10-08",
  );

  assert.equal(snapshot.scheduled, 230000);
  assert.equal(snapshot.paid, 190000);
  assert.equal(snapshot.outstanding, 40000);
  assert.equal(snapshot.overdue, 1);
  assert.equal(snapshot.paidCount, 1);
});

test("bill payload validation rejects invalid schedule values", () => {
  assert.equal(validBillsData([rent], [rentPayment]), true);
  assert.equal(validBillsData([{ ...rent, dueDay: 32 }], []), false);
  assert.equal(
    validBillsData([{ ...rent, endMonth: "2025-12" }], []),
    false,
  );
  assert.equal(
    validBillsData([rent], [{ ...rentPayment, paymentDate: "2026-02-31" }]),
    false,
  );
});

test("workspace enforces bill payment ownership, recurrence, and unique periods", () => {
  const base = {
    expenses: [
      {
        id: rentPayment.expenseId,
        description: "Rent",
        category: "Housing" as const,
        amount: rentPayment.amount,
        date: rentPayment.paymentDate,
      },
    ],
    budgets: {},
    categoryBudgets: {},
    governmentAccounts: [],
    governmentContributions: [],
    mp2Accounts: [],
    mp2Deposits: [],
    recurringBills: [rent, internet],
    billPayments: [rentPayment],
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [{ ...base.expenses[0], amount: rentPayment.amount - 1 }],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [{ ...base.expenses[0], date: "2026-10-02" }],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      expenses: [{ ...base.expenses[0], category: "Food" as const }],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      billPayments: [
        {
          ...rentPayment,
          billId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      billPayments: [
        {
          ...rentPayment,
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          billId: internet.id,
          period: "2026-11",
        },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      billPayments: [
        rentPayment,
        {
          ...rentPayment,
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
    }),
    false,
  );
});

test("workspace rejects recurring bills outside budget categories", () => {
  assert.equal(
    validWorkspace({
      expenses: [],
      budgets: {},
      categoryBudgets: {},
      recurringBills: [{ ...rent, category: "Unknown" }],
      billPayments: [],
    }),
    false,
  );
});
