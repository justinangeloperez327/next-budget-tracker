import test from "node:test";
import assert from "node:assert/strict";
import { monthlyBudgetReport, type BudgetData } from "../src/lib/budget.ts";
import { reportingCutoff, monthEndDate, recordedInMonth } from "../src/lib/reporting-period.ts";
import { financialDashboardSnapshot } from "../src/lib/financial-dashboard.ts";
import {
  monthlyFinancialReport, monthlyFinancialReportCsv,
  yearlyFinancialReport, yearlyFinancialReportCsv,
} from "../src/lib/reports.ts";

const data: BudgetData = {
  expenses: [
    { id: "dec-expense", description: "December groceries", amount: 10025, category: "Food", date: "2026-12-31" },
    { id: "jan-expense", description: "January groceries", amount: 230, category: "Food", date: "2027-01-01" },
  ],
  budgets: { "2026-12": 20025, "2027-01": 5000 },
  remittances: [
    {
      id: "dec-completed", recipient: "Family", destinationType: "Family / person",
      sentAmount: 2575, feeAmount: 125, receivedAmount: 150250,
      transferDate: "2026-12-31", status: "Completed",
      principalAsExpense: true, category: "Other",
    },
    {
      id: "dec-pending", recipient: "Own account", destinationType: "Own account",
      sentAmount: 1000, feeAmount: 25,
      transferDate: "2026-12-31", status: "Pending",
      principalAsExpense: false, category: "Other",
    },
  ],
  mp2Accounts: [{
    id: "mp2-fixture", name: "MP2", dividendOption: "Compounded", active: true,
  }],
  mp2Deposits: [{
    id: "mp2-dec", accountId: "mp2-fixture", paymentDate: "2026-12-31", amount: 56789,
  }],
  governmentAccounts: [{
    id: "sss-fixture", provider: "SSS", memberType: "OFW",
    frequency: "Monthly", active: true,
  }],
  governmentContributions: [{
    id: "sss-dec", accountId: "sss-fixture", period: "2026-12",
    amount: 12345, paymentDate: "2026-12-30", status: "Paid",
  }],
};

test("reporting cutoffs handle leap years, nonleap years, and year rollover", () => {
  assert.equal(monthEndDate("2024-02"), "2024-02-29");
  assert.equal(monthEndDate("2026-02"), "2026-02-28");
  assert.equal(monthEndDate("2026-12"), "2026-12-31");
  assert.equal(monthEndDate("2027-01"), "2027-01-31");
  assert.equal(reportingCutoff("2024-02", "2024-02-28"), "2024-02-28");
  assert.equal(reportingCutoff("2024-02", "2024-03-01"), "2024-02-29");
  assert.equal(reportingCutoff("2026-12", "2027-01-01"), "2026-12-31");
  assert.equal(reportingCutoff("2027-01", "2026-12-31"), "2026-12-31");
  assert.equal(recordedInMonth("2024-02-29", "2024-02", "2024-02-28"), false);
  assert.equal(recordedInMonth("2024-02-29", "2024-02", "2024-02-29"), true);
  assert.equal(recordedInMonth("2027-01-01", "2026-12", "2027-01-02"), false);
});

test("December and January financial reports never combine different years or currencies", () => {
  const december = monthlyFinancialReport(data, "2026-12", "2027-01-02");
  assert.equal(december.budget.budget, 20025);
  assert.equal(december.budget.actual, 10025);
  assert.equal(december.budget.unspentBudget, 10000);
  assert.equal(december.aed.remitted, 2575);
  assert.equal(december.aed.pendingRemittances, 1000);
  assert.equal(december.php.remittanceReceived, 150250);
  assert.equal(december.php.mp2Saved, 56789);
  assert.equal(december.php.governmentPaid, 12345);

  const january = monthlyFinancialReport(data, "2027-01", "2027-01-02");
  assert.equal(january.budget.actual, 230);
  assert.equal(january.aed.remitted, 0);
  assert.equal(january.aed.pendingRemittances, 0);
  assert.equal(january.php.remittanceReceived, 0);
  assert.equal(january.php.mp2Saved, 0);
  assert.equal(january.php.governmentPaid, 0);

  const annual2026 = yearlyFinancialReport(data, 2026, "2027-01-02");
  const annual2027 = yearlyFinancialReport(data, 2027, "2027-01-02");
  assert.equal(annual2026.aed.spent, 10025);
  assert.equal(annual2027.aed.spent, 230);
  assert.equal(annual2026.php.remittanceReceived, 150250);
  assert.equal(annual2027.php.remittanceReceived, 0);
});

test("CSV monetary values remain exact to the centavo and fils and retain currency labels", () => {
  const monthly = monthlyFinancialReportCsv(data, "2026-12", "2027-01-02");
  assert.match(monthly, /"Actual spending","AED",100\.25/);
  assert.match(monthly, /"Completed remittances","AED",25\.75/);
  assert.match(monthly, /"Pending remittances","AED",10\.00/);
  assert.match(monthly, /"Remittance received","PHP",1502\.50/);
  assert.match(monthly, /"MP2 saved","PHP",567\.89/);
  assert.match(monthly, /"Government contributions","PHP",123\.45/);
  const yearly = yearlyFinancialReportCsv(data, 2026, "2027-01-02");
  assert.match(yearly, /"Spent AED"/);
  assert.match(yearly, /"Government Contributions PHP"/);
  assert.match(yearly, /"Remittance Received PHP"/);
  assert.match(yearly, /"Pending Remittances AED"/);
  assert.match(yearly, /"2026-12"/);
});

test("an as-of date before a December transaction excludes it without hiding future budget plans", () => {
  const snapshot = financialDashboardSnapshot(data, "2026-12", "2026-12-30");
  assert.equal(snapshot.aed.spent, 0);
  assert.equal(snapshot.aed.remitted, 0);
  assert.equal(snapshot.aed.pendingRemittances, 0);
  assert.equal(snapshot.php.remittanceReceived, 0);
  assert.equal(snapshot.mp2.currentMonthSaved, 0);
  const plan = monthlyBudgetReport(data, "2026-12", "2026-12-30");
  assert.equal(plan.budget, 20025);
  assert.equal(plan.actual, 0);
  assert.equal(plan.unspentBudget, 20025);
});

test("hundreds of integer-minor-unit expenses aggregate without floating point drift", () => {
  const expenses = Array.from({ length: 500 }, (_, index) => ({
    id: `expense-${index}`,
    description: "Financial regression",
    amount: (index % 13) + 1,
    category: "Food" as const,
    date: index % 2 ? "2024-02-29" : "2024-03-01",
  }));
  const large: BudgetData = { expenses, budgets: { "2024-02": 25000, "2024-03": 25000 } };
  const february = monthlyBudgetReport(large, "2024-02", "2024-02-29");
  const march = monthlyBudgetReport(large, "2024-03", "2024-03-01");
  const expectedFebruary = expenses.filter((expense) => expense.date === "2024-02-29")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const expectedMarch = expenses.filter((expense) => expense.date === "2024-03-01")
    .reduce((sum, expense) => sum + expense.amount, 0);
  assert.equal(february.actual, expectedFebruary);
  assert.equal(march.actual, expectedMarch);
  assert.equal(february.actual + march.actual, expenses.reduce((sum, entry) => sum + entry.amount, 0));
});
