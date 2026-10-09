import type { BudgetData } from "./budget.ts";
import { billOccurrencesForPeriod } from "./bills.ts";
import { debtSnapshot } from "./debt.ts";
import {
  contributionDashboardSnapshot,
  expectedContributionPeriods,
  governmentProviderDefinitions,
  governmentProviders,
} from "./government.ts";
import { mp2AccountSnapshot } from "./mp2.ts";
import { savingsGoalSnapshot } from "./savings.ts";

export type ReminderSeverity = "overdue" | "due-soon" | "pending" | "info";
export type ReminderSource =
  | "Bill"
  | "Debt"
  | "Contribution"
  | "Savings"
  | "MP2"
  | "Remittance";

export type FinancialReminder = {
  id: string;
  source: ReminderSource;
  title: string;
  detail: string;
  href: string;
  severity: ReminderSeverity;
  dueDate?: string;
  amount?: number;
  currency?: "AED" | "PHP";
};

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string) {
  const start = new Date(from + "T00:00:00Z").getTime();
  const end = new Date(to + "T00:00:00Z").getTime();
  return Math.round((end - start) / DAY_MS);
}

function priority(severity: ReminderSeverity) {
  if (severity === "overdue") return 0;
  if (severity === "due-soon") return 1;
  if (severity === "pending") return 2;
  return 3;
}

export function financialReminders(
  data: BudgetData,
  today: string,
): FinancialReminder[] {
  const reminders: FinancialReminder[] = [];
  const period = today.slice(0, 7);

  for (const occurrence of billOccurrencesForPeriod(
    data.recurringBills ?? [],
    data.billPayments ?? [],
    period,
    today,
  )) {
    if (occurrence.status === "Overdue" || occurrence.status === "Due soon") {
      reminders.push({
        id: `bill:${occurrence.bill.id}:${period}`,
        source: "Bill",
        title:
          occurrence.status === "Overdue"
            ? `${occurrence.bill.name} is overdue`
            : `${occurrence.bill.name} is due soon`,
        detail: `Due ${occurrence.dueDate}`,
        href: "/bills",
        severity:
          occurrence.status === "Overdue" ? "overdue" : "due-soon",
        dueDate: occurrence.dueDate,
        amount: occurrence.bill.amount,
        currency: "AED",
      });
    }
  }

  for (const debt of data.debts ?? []) {
    const snapshot = debtSnapshot(debt, data.debtPayments ?? [], today);
    if (snapshot.remaining <= 0 || !debt.active || !debt.dueDate) continue;
    const days = daysBetween(today, debt.dueDate);
    if (days < 0 || days <= 30) {
      reminders.push({
        id: `debt:${debt.id}`,
        source: "Debt",
        title: days < 0 ? `${debt.name} is overdue` : `${debt.name} is due soon`,
        detail:
          days < 0
            ? `Due date was ${debt.dueDate}`
            : `Due ${debt.dueDate} · ${days} day${days === 1 ? "" : "s"} remaining`,
        href: "/debts",
        severity: days < 0 ? "overdue" : "due-soon",
        dueDate: debt.dueDate,
        amount: snapshot.remaining,
        currency: "AED",
      });
    }
  }

  for (const provider of governmentProviders) {
    const account = (data.governmentAccounts ?? []).find(
      (entry) => entry.provider === provider,
    );
    if (!account?.active) continue;

    const label = governmentProviderDefinitions[provider].shortLabel;
    const href =
      governmentProviderDefinitions[provider].trackerPath ?? "/contributions";
    const snapshot = contributionDashboardSnapshot(
      account,
      data.governmentContributions ?? [],
      today,
    );

    for (const missedPeriod of snapshot.missedPeriods) {
      reminders.push({
        id: `contribution:${provider}:missed:${missedPeriod}`,
        source: "Contribution",
        title: `${label} contribution marked missed`,
        detail: `${missedPeriod} needs review`,
        href,
        severity: "overdue",
        dueDate: `${missedPeriod}-01`,
        currency: "PHP",
      });
    }

    if (snapshot.gapPeriods.length > 0) {
      const latestGap = snapshot.gapPeriods.at(-1)!;
      reminders.push({
        id: `contribution:${provider}:gaps`,
        source: "Contribution",
        title: `${label} has contribution gaps`,
        detail: `${snapshot.gapPeriods.length} prior expected period${snapshot.gapPeriods.length === 1 ? "" : "s"} have no record; no record is not automatically marked missed`,
        href,
        severity: "pending",
        dueDate: `${latestGap}-01`,
        currency: "PHP",
      });
    }

    for (const pendingPeriod of snapshot.pendingPeriods) {
      reminders.push({
        id: `contribution:${provider}:pending:${pendingPeriod}`,
        source: "Contribution",
        title: `${label} contribution is pending`,
        detail: `${pendingPeriod} is awaiting completion`,
        href,
        severity: "pending",
        dueDate: `${pendingPeriod}-01`,
        currency: "PHP",
      });
    }

    const currentExpected = expectedContributionPeriods(
      account,
      Number(today.slice(0, 4)),
    ).includes(period);
    const hasCurrentRecord = (data.governmentContributions ?? []).some(
      (entry) => entry.accountId === account.id && entry.period === period,
    );
    if (currentExpected && !hasCurrentRecord) {
      reminders.push({
        id: `contribution:${provider}:current:${period}`,
        source: "Contribution",
        title: `${label} current period has no record`,
        detail: `${period} is expected, but no contribution record exists yet`,
        href,
        severity: "info",
        currency: "PHP",
      });
    }
  }

  for (const goal of data.savingsGoals ?? []) {
    const snapshot = savingsGoalSnapshot(
      goal,
      data.savingsDeposits ?? [],
      today,
    );
    if (!goal.active || snapshot.remaining <= 0) continue;

    if (goal.targetDate) {
      const days = daysBetween(today, goal.targetDate);
      if (days < 0 || days <= 30) {
        reminders.push({
          id: `savings:${goal.id}:deadline`,
          source: "Savings",
          title:
            days < 0
              ? `${goal.name} target date has passed`
              : `${goal.name} target date is approaching`,
          detail:
            days < 0
              ? `Target date was ${goal.targetDate}`
              : `Target ${goal.targetDate} · ${days} day${days === 1 ? "" : "s"} remaining`,
          href: "/savings",
          severity: days < 0 ? "info" : "due-soon",
          dueDate: goal.targetDate,
          amount: snapshot.remaining,
          currency: "AED",
        });
      }
    }

    if (
      Number(today.slice(8, 10)) >= 20 &&
      goal.monthlyTarget &&
      snapshot.currentMonthSaved < goal.monthlyTarget
    ) {
      reminders.push({
        id: `savings:${goal.id}:monthly:${period}`,
        source: "Savings",
        title: `${goal.name} monthly target is not complete`,
        detail: "Add more this month to reach the planned contribution.",
        href: "/savings",
        severity: "info",
        amount: goal.monthlyTarget - snapshot.currentMonthSaved,
        currency: "AED",
      });
    }
  }

  for (const account of data.mp2Accounts ?? []) {
    if (!account.active) continue;
    const snapshot = mp2AccountSnapshot(
      account,
      data.mp2Deposits ?? [],
      today,
    );

    if (
      Number(today.slice(8, 10)) >= 20 &&
      account.monthlyTarget &&
      snapshot.currentMonthSaved < account.monthlyTarget
    ) {
      reminders.push({
        id: `mp2:${account.id}:monthly:${period}`,
        source: "MP2",
        title: `${account.name} monthly target is not complete`,
        detail: "Record additional MP2 savings if you intend to meet this month's target.",
        href: "/mp2",
        severity: "info",
        amount: account.monthlyTarget - snapshot.currentMonthSaved,
        currency: "PHP",
      });
    }

    if (snapshot.maturityDate) {
      const days = daysBetween(today, snapshot.maturityDate);
      if (days < 0 || days <= 60) {
        reminders.push({
          id: `mp2:${account.id}:maturity`,
          source: "MP2",
          title:
            days < 0
              ? `${account.name} has reached maturity`
              : `${account.name} maturity is approaching`,
          detail:
            days < 0
              ? `Maturity date was ${snapshot.maturityDate}`
              : `Matures ${snapshot.maturityDate} · ${days} day${days === 1 ? "" : "s"} remaining`,
          href: "/mp2",
          severity: days < 0 ? "info" : "due-soon",
          dueDate: snapshot.maturityDate,
          currency: "PHP",
        });
      }
    }
  }

  for (const remittance of data.remittances ?? []) {
    if (remittance.status !== "Pending") continue;
    reminders.push({
      id: `remittance:${remittance.id}`,
      source: "Remittance",
      title: `Remittance to ${remittance.recipient} is pending`,
      detail: `Started ${remittance.transferDate}`,
      href: "/remittances",
      severity: "pending",
      dueDate: remittance.transferDate,
      amount: remittance.sentAmount,
      currency: "AED",
    });
  }

  return reminders.toSorted((a, b) => {
    const severity = priority(a.severity) - priority(b.severity);
    if (severity !== 0) return severity;
    const dueDate = (a.dueDate ?? "9999-12-31").localeCompare(
      b.dueDate ?? "9999-12-31",
    );
    if (dueDate !== 0) return dueDate;
    return a.title.localeCompare(b.title);
  });
}

export function reminderSummary(reminders: FinancialReminder[]) {
  return {
    total: reminders.length,
    overdue: reminders.filter((entry) => entry.severity === "overdue").length,
    dueSoon: reminders.filter((entry) => entry.severity === "due-soon").length,
    pending: reminders.filter((entry) => entry.severity === "pending").length,
    info: reminders.filter((entry) => entry.severity === "info").length,
  };
}
