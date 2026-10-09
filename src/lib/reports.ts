import {
  historicalBudgetAnalysis,
  monthlyBudgetReport,
  type BudgetData,
} from "./budget.ts";
import { financialDashboardSnapshot } from "./financial-dashboard.ts";
import { governmentProviders } from "./government.ts";

function monthsForYear(year: number, today: string) {
  const currentYear = Number(today.slice(0, 4));
  const endMonth =
    year < currentYear ? 12 : year === currentYear ? Number(today.slice(5, 7)) : 0;
  return Array.from({ length: endMonth }, (_, index) =>
    `${year}-${String(index + 1).padStart(2, "0")}`,
  );
}

export function financialReportYears(
  data: BudgetData,
  currentYear = new Date().getFullYear(),
) {
  const years = [
    ...Object.keys(data.budgets).map((month) => Number(month.slice(0, 4))),
    ...Object.keys(data.categoryBudgets ?? {}).map((month) =>
      Number(month.slice(0, 4)),
    ),
    ...data.expenses.map((entry) => Number(entry.date.slice(0, 4))),
    ...(data.governmentContributions ?? []).map((entry) =>
      Number(entry.period.slice(0, 4)),
    ),
    ...(data.mp2Deposits ?? []).map((entry) =>
      Number(entry.paymentDate.slice(0, 4)),
    ),
    ...(data.billPayments ?? []).map((entry) =>
      Number(entry.paymentDate.slice(0, 4)),
    ),
    ...(data.debtPayments ?? []).map((entry) =>
      Number(entry.paymentDate.slice(0, 4)),
    ),
    ...(data.savingsDeposits ?? []).map((entry) =>
      Number(entry.depositDate.slice(0, 4)),
    ),
    ...(data.remittances ?? []).map((entry) =>
      Number(entry.transferDate.slice(0, 4)),
    ),
  ].filter(Number.isInteger);

  return [...new Set([currentYear, ...years])].toSorted((a, b) => b - a);
}

export function monthlyFinancialReport(
  data: BudgetData,
  month: string,
  today: string,
) {
  const budget = monthlyBudgetReport(data, month);
  const financial = financialDashboardSnapshot(data, month, today);
  const savingsAdded = (data.savingsDeposits ?? [])
    .filter((entry) => entry.depositDate.startsWith(month))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const debtRepaid = (data.debtPayments ?? [])
    .filter((entry) => entry.paymentDate.startsWith(month))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const billsPaid = (data.billPayments ?? [])
    .filter((entry) => entry.paymentDate.startsWith(month))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const governmentPaid = (data.governmentContributions ?? [])
    .filter((entry) => entry.period === month && entry.status === "Paid")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const mp2Saved = (data.mp2Deposits ?? [])
    .filter((entry) => entry.paymentDate.startsWith(month))
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    month,
    budget,
    financial,
    aed: {
      savingsAdded,
      debtRepaid,
      billsPaid,
      remitted: financial.aed.remitted,
      remittanceFees: financial.aed.remittanceFees,
      remittanceSupport: financial.aed.remittanceSupport,
      ownAccountTransfers: financial.aed.ownAccountTransfers,
    },
    php: {
      governmentPaid,
      mp2Saved,
      remittanceReceived: financial.php.remittanceReceived,
    },
  };
}

export function yearlyFinancialReport(
  data: BudgetData,
  year: number,
  today: string,
) {
  const months = monthsForYear(year, today);
  const monthly = months.map((month) => monthlyFinancialReport(data, month, today));
  const history = historicalBudgetAnalysis(data, months);
  const yearPrefix = String(year);

  const governmentByProvider = governmentProviders.map((provider) => {
    const account = (data.governmentAccounts ?? []).find(
      (entry) => entry.provider === provider,
    );
    const amount = account
      ? (data.governmentContributions ?? [])
          .filter(
            (entry) =>
              entry.accountId === account.id &&
              entry.period.startsWith(yearPrefix) &&
              entry.status === "Paid",
          )
          .reduce((sum, entry) => sum + entry.amount, 0)
      : 0;
    return { provider, configured: !!account, amount };
  });

  return {
    year,
    months,
    monthly,
    history,
    aed: {
      budget: history.totalBudget,
      spent: history.totalActual,
      variance: history.netVariance,
      grossSaved: history.totalSaved,
      grossOverspent: history.totalOverspent,
      savingsAdded: monthly.reduce((sum, entry) => sum + entry.aed.savingsAdded, 0),
      debtRepaid: monthly.reduce((sum, entry) => sum + entry.aed.debtRepaid, 0),
      billsPaid: monthly.reduce((sum, entry) => sum + entry.aed.billsPaid, 0),
      remitted: monthly.reduce((sum, entry) => sum + entry.aed.remitted, 0),
      remittanceFees: monthly.reduce(
        (sum, entry) => sum + entry.aed.remittanceFees,
        0,
      ),
      supportRemitted: monthly.reduce(
        (sum, entry) => sum + entry.aed.remittanceSupport,
        0,
      ),
      ownAccountTransfers: monthly.reduce(
        (sum, entry) => sum + entry.aed.ownAccountTransfers,
        0,
      ),
    },
    php: {
      governmentPaid: monthly.reduce(
        (sum, entry) => sum + entry.php.governmentPaid,
        0,
      ),
      mp2Saved: monthly.reduce((sum, entry) => sum + entry.php.mp2Saved, 0),
      remittanceReceived: monthly.reduce(
        (sum, entry) => sum + entry.php.remittanceReceived,
        0,
      ),
      governmentByProvider,
    },
  };
}

function csvEscape(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}

export function yearlyFinancialReportCsv(
  data: BudgetData,
  year: number,
  today: string,
) {
  const report = yearlyFinancialReport(data, year, today);
  const header = [
    "Month",
    "Budget AED",
    "Spent AED",
    "Variance AED",
    "Bills Paid AED",
    "Debt Repaid AED",
    "Savings Added AED",
    "Remitted AED",
    "Remittance Fees AED",
    "Own Account Transfers AED",
    "Government Contributions PHP",
    "MP2 Saved PHP",
    "Remittance Received PHP",
  ];

  const rows = report.monthly.map((entry) => [
    entry.month,
    entry.budget.budget,
    entry.budget.actual,
    entry.budget.variance,
    entry.aed.billsPaid,
    entry.aed.debtRepaid,
    entry.aed.savingsAdded,
    entry.aed.remitted,
    entry.aed.remittanceFees,
    entry.aed.ownAccountTransfers,
    entry.php.governmentPaid,
    entry.php.mp2Saved,
    entry.php.remittanceReceived,
  ]);

  return [
    header.map(csvEscape).join(","),
    ...rows.map((row) =>
      row
        .map((value, index) =>
          index === 0
            ? csvEscape(String(value))
            : (Number(value) / 100).toFixed(2),
        )
        .join(","),
    ),
  ].join("\r\n");
}

export function monthlyFinancialReportCsv(
  data: BudgetData,
  month: string,
  today: string,
) {
  const report = monthlyFinancialReport(data, month, today);
  const lines = [
    ["Metric", "Currency", "Amount"],
    ["Monthly budget", "AED", report.budget.budget],
    ["Actual spending", "AED", report.budget.actual],
    ["Budget variance", "AED", report.budget.variance],
    ["Bills paid", "AED", report.aed.billsPaid],
    ["Debt repaid", "AED", report.aed.debtRepaid],
    ["Savings added", "AED", report.aed.savingsAdded],
    ["Remitted", "AED", report.aed.remitted],
    ["Remittance fees", "AED", report.aed.remittanceFees],
    ["Own-account transfers", "AED", report.aed.ownAccountTransfers],
    ["Government contributions", "PHP", report.php.governmentPaid],
    ["MP2 saved", "PHP", report.php.mp2Saved],
    ["Remittance received", "PHP", report.php.remittanceReceived],
  ];

  return lines
    .map((row, rowIndex) =>
      row
        .map((value, columnIndex) =>
          rowIndex === 0 || columnIndex < 2
            ? csvEscape(String(value))
            : (Number(value) / 100).toFixed(2),
        )
        .join(","),
    )
    .join("\r\n");
}

