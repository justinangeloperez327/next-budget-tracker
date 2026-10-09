import {
  monthlyBudgetReport,
  type BudgetData,
} from "./budget.ts";
import { billDashboardSnapshot } from "./bills.ts";
import { debtDashboardSnapshot } from "./debt.ts";
import { savingsDashboardSnapshot } from "./savings.ts";
import { remittanceMonthSummary } from "./remittance.ts";
import {
  contributionDashboardSnapshot,
  governmentProviderDefinitions,
  governmentProviders,
} from "./government.ts";
import { mp2AccountSnapshot } from "./mp2.ts";

export type FinancialAttentionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  severity: "attention" | "info";
};

function monthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function financialDashboardSnapshot(
  data: BudgetData,
  month: string,
  today: string,
) {
  const asOfDate =
    month === today.slice(0, 7) ? today : monthEndDate(month);

  const budget = monthlyBudgetReport(data, month);
  const bills = billDashboardSnapshot(
    data.recurringBills ?? [],
    data.billPayments ?? [],
    asOfDate,
  );
  const debts = debtDashboardSnapshot(
    data.debts ?? [],
    data.debtPayments ?? [],
    asOfDate,
  );
  const savings = savingsDashboardSnapshot(
    data.savingsGoals ?? [],
    data.savingsDeposits ?? [],
    asOfDate,
  );
  const remittances = remittanceMonthSummary(data.remittances ?? [], month);

  const contributions = governmentProviders.map((provider) => {
    const account = (data.governmentAccounts ?? []).find(
      (entry) => entry.provider === provider,
    );
    const snapshot = contributionDashboardSnapshot(
      account,
      data.governmentContributions ?? [],
      asOfDate,
    );
    return {
      provider,
      label: governmentProviderDefinitions[provider].shortLabel,
      configured: !!account,
      active: account?.active ?? false,
      ...snapshot,
      attentionCount:
        snapshot.gapPeriods.length +
        snapshot.pendingPeriods.length +
        snapshot.missedPeriods.length,
      href: governmentProviderDefinitions[provider].trackerPath ?? "/contributions",
    };
  });

  const selectedYear = month.slice(0, 4);
  const selectedMonthEnd = monthEndDate(month);
  const mp2Snapshots = (data.mp2Accounts ?? []).map((account) =>
    mp2AccountSnapshot(
      account,
      (data.mp2Deposits ?? []).filter(
        (deposit) => deposit.paymentDate <= selectedMonthEnd,
      ),
      asOfDate,
    ),
  );
  const mp2 = {
    accountCount: mp2Snapshots.length,
    activeCount: mp2Snapshots.filter((snapshot) => snapshot.account.active)
      .length,
    totalSaved: mp2Snapshots.reduce(
      (sum, snapshot) => sum + snapshot.totalSaved,
      0,
    ),
    ytdSaved: (data.mp2Deposits ?? [])
      .filter(
        (deposit) =>
          deposit.paymentDate.startsWith(selectedYear) &&
          deposit.paymentDate <= selectedMonthEnd,
      )
      .reduce((sum, deposit) => sum + deposit.amount, 0),
    currentMonthSaved: (data.mp2Deposits ?? [])
      .filter((deposit) => deposit.paymentDate.startsWith(month))
      .reduce((sum, deposit) => sum + deposit.amount, 0),
    maturedCount: mp2Snapshots.filter(
      (snapshot) => snapshot.maturityStatus === "Matured",
    ).length,
  };

  const governmentYtdPaid = contributions.reduce(
    (sum, entry) => sum + entry.ytdPaid,
    0,
  );
  const governmentAttentionCount = contributions.reduce(
    (sum, entry) => sum + entry.attentionCount,
    0,
  );

  const attention: FinancialAttentionItem[] = [];
  if (bills.overdue > 0)
    attention.push({
      id: "overdue-bills",
      label: "Overdue bills",
      detail: `${bills.overdue} bill${bills.overdue === 1 ? "" : "s"} need attention`,
      href: "/bills",
      severity: "attention",
    });
  if (debts.overdueCount > 0)
    attention.push({
      id: "overdue-debts",
      label: "Overdue debt",
      detail: `${debts.overdueCount} debt${debts.overdueCount === 1 ? "" : "s"} past due`,
      href: "/debts",
      severity: "attention",
    });
  if (savings.pastDueCount > 0)
    attention.push({
      id: "past-due-savings",
      label: "Savings goals past target date",
      detail: `${savings.pastDueCount} goal${savings.pastDueCount === 1 ? "" : "s"} need review`,
      href: "/savings",
      severity: "attention",
    });
  for (const contribution of contributions) {
    if (contribution.attentionCount > 0)
      attention.push({
        id: `contribution-${contribution.provider}`,
        label: `${contribution.label} contribution status`,
        detail: `${contribution.attentionCount} gap, pending, or missed period${contribution.attentionCount === 1 ? "" : "s"}`,
        href: contribution.href,
        severity: "attention",
      });
  }
  if (remittances.pendingCount > 0)
    attention.push({
      id: "pending-remittances",
      label: "Pending remittances",
      detail: `${remittances.pendingCount} transfer${remittances.pendingCount === 1 ? "" : "s"} not completed yet`,
      href: "/remittances",
      severity: "info",
    });

  return {
    month,
    asOfDate,
    aed: {
      budget: budget.budget,
      spent: budget.actual,
      variance: budget.variance,
      savingsRate: budget.savingsRate,
      billsOutstanding: bills.outstanding,
      overdueBills: bills.overdue,
      debtRemaining: debts.remaining,
      overdueDebts: debts.overdueCount,
      savingsSaved: savings.totalSaved,
      savingsRemaining: savings.totalRemaining,
      remitted: remittances.sentAmount,
      remittanceFees: remittances.feeAmount,
      remittanceSupport: remittances.supportAmount,
      ownAccountTransfers: remittances.ownTransferAmount,
    },
    php: {
      governmentYtdPaid,
      governmentAttentionCount,
      mp2TotalSaved: mp2.totalSaved,
      mp2YtdSaved: mp2.ytdSaved,
      mp2CurrentMonthSaved: mp2.currentMonthSaved,
      remittanceReceived: remittances.receivedAmount,
    },
    contributions,
    mp2,
    bills,
    debts,
    savings,
    remittances,
    attention,
  };
}
