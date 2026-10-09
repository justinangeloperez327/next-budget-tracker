import test from "node:test";
import assert from "node:assert/strict";
import {
  financialReportYears,
  monthlyFinancialReport,
  monthlyFinancialReportCsv,
  yearlyFinancialReport,
  yearlyFinancialReportCsv,
} from "../src/lib/reports.ts";
import type { BudgetData } from "../src/lib/budget.ts";

const data: BudgetData = {
  expenses: [
    {
      id: "51515151-aaaa-4515-8515-515151515151",
      description: "House",
      amount: 180000,
      category: "Housing",
      date: "2026-09-01",
    },
    {
      id: "52525252-bbbb-4525-8525-525252525252",
      description: "Debt payment",
      amount: 50000,
      category: "Other",
      date: "2026-10-05",
    },
    {
      id: "53535353-cccc-4535-8535-535353535353",
      description: "Remittance fee",
      amount: 1500,
      category: "Other",
      date: "2026-10-09",
    },
  ],
  budgets: {
    "2026-09": 200000,
    "2026-10": 300000,
  },
  categoryBudgets: {
    "2026-09": { Housing: 200000 },
    "2026-10": { Other: 100000 },
  },
  governmentAccounts: [
    {
      id: "54545454-dddd-4545-8545-545454545454",
      provider: "SSS",
      memberType: "OFW",
      monthlyTarget: 500000,
      frequency: "Monthly",
      active: true,
    },
  ],
  governmentContributions: [
    {
      id: "55555555-eeee-4555-8555-555555555555",
      accountId: "54545454-dddd-4545-8545-545454545454",
      period: "2026-10",
      amount: 500000,
      paymentDate: "2026-10-06",
      status: "Paid",
    },
  ],
  mp2Accounts: [
    {
      id: "56565656-ffff-4565-8565-565656565656",
      name: "MP2",
      dividendOption: "Compounded",
      active: true,
    },
  ],
  mp2Deposits: [
    {
      id: "57575757-aaaa-4575-8575-575757575757",
      accountId: "56565656-ffff-4565-8565-565656565656",
      paymentDate: "2026-10-07",
      amount: 100000,
    },
  ],
  recurringBills: [
    {
      id: "58585858-bbbb-4585-8585-585858585858",
      name: "Utilities",
      category: "Housing",
      amount: 10000,
      frequency: "Monthly",
      dueDay: 3,
      startMonth: "2026-01",
      active: true,
    },
  ],
  billPayments: [
    {
      id: "59595959-cccc-4595-8595-595959595959",
      billId: "58585858-bbbb-4585-8585-585858585858",
      period: "2026-10",
      amount: 10000,
      paymentDate: "2026-10-03",
      expenseId: "60606060-dddd-4606-8606-606060606060",
    },
  ],
  debts: [
    {
      id: "61616161-eeee-4616-8616-616161616161",
      name: "Loan",
      lender: "Bank",
      originalAmount: 200000,
      category: "Other",
      startDate: "2026-01-01",
      active: true,
    },
  ],
  debtPayments: [
    {
      id: "62626262-ffff-4626-8626-626262626262",
      debtId: "61616161-eeee-4616-8616-616161616161",
      amount: 50000,
      paymentDate: "2026-10-05",
      expenseId: "52525252-bbbb-4525-8525-525252525252",
    },
  ],
  savingsGoals: [
    {
      id: "63636363-aaaa-4636-8636-636363636363",
      name: "Emergency",
      targetAmount: 1000000,
      startDate: "2026-01-01",
      active: true,
    },
  ],
  savingsDeposits: [
    {
      id: "64646464-bbbb-4646-8646-646464646464",
      goalId: "63636363-aaaa-4636-8636-636363636363",
      amount: 75000,
      depositDate: "2026-10-04",
    },
  ],
  remittances: [
    {
      id: "65656565-cccc-4656-8656-656565656565",
      recipient: "PH Savings",
      destinationType: "Own account",
      sentAmount: 100000,
      feeAmount: 1500,
      receivedAmount: 1550000,
      transferDate: "2026-10-09",
      status: "Completed",
      principalAsExpense: false,
      category: "Other",
      expenseId: "53535353-cccc-4535-8535-535353535353",
    },
  ],
};

test("monthly financial report keeps operational flows distinct", () => {
  const report = monthlyFinancialReport(data, "2026-10", "2026-10-09");

  assert.equal(report.budget.budget, 300000);
  assert.equal(report.budget.actual, 51500);
  assert.equal(report.aed.debtRepaid, 50000);
  assert.equal(report.aed.savingsAdded, 75000);
  assert.equal(report.aed.remitted, 100000);
  assert.equal(report.aed.ownAccountTransfers, 100000);
  assert.equal(report.php.governmentPaid, 500000);
  assert.equal(report.php.mp2Saved, 100000);
  assert.equal(report.php.remittanceReceived, 1550000);
});

test("yearly financial report aggregates recorded months without currency mixing", () => {
  const report = yearlyFinancialReport(data, 2026, "2026-10-09");

  assert.equal(report.months.length, 10);
  assert.equal(report.aed.budget, 500000);
  assert.equal(report.aed.spent, 231500);
  assert.equal(report.aed.savingsAdded, 75000);
  assert.equal(report.aed.debtRepaid, 50000);
  assert.equal(report.aed.remitted, 100000);
  assert.equal(report.php.governmentPaid, 500000);
  assert.equal(report.php.mp2Saved, 100000);
  assert.equal(report.php.remittanceReceived, 1550000);
});

test("financial report years include all reportable record sources", () => {
  assert.deepEqual(financialReportYears(data, 2027), [2027, 2026]);
});

test("monthly report CSV declares currency per metric", () => {
  const csv = monthlyFinancialReportCsv(data, "2026-10", "2026-10-09");

  assert.match(csv, /"Metric","Currency","Amount"/);
  assert.match(csv, /"Monthly budget","AED",3000\.00/);
  assert.match(csv, /"Government contributions","PHP",5000\.00/);
  assert.match(csv, /"Remittance received","PHP",15500\.00/);
});

test("yearly report CSV keeps AED and PHP in separate columns", () => {
  const csv = yearlyFinancialReportCsv(data, 2026, "2026-10-09");

  assert.match(csv, /"Budget AED"/);
  assert.match(csv, /"Government Contributions PHP"/);
  assert.match(csv, /"Remittance Received PHP"/);
  assert.match(csv, /"2026-10"/);
});
