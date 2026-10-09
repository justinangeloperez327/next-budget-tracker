export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  startDate: string;
  targetDate?: string;
  monthlyTarget?: number;
  destination?: string;
  active: boolean;
  notes?: string;
};

export type SavingsDeposit = {
  id: string;
  goalId: string;
  amount: number;
  depositDate: string;
  referenceNumber?: string;
  notes?: string;
};

export type SavingsGoalStatus = "Completed" | "Past due" | "Active" | "Paused";

export type SavingsGoalSnapshot = {
  goal: SavingsGoal;
  saved: number;
  remaining: number;
  progressRate: number;
  status: SavingsGoalStatus;
  currentMonthSaved: number;
  monthlyTargetProgress: number;
  lastDeposit?: SavingsDeposit;
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

export function validSavingsData(
  goalsValue: unknown,
  depositsValue: unknown,
) {
  if (
    goalsValue !== undefined &&
    (!Array.isArray(goalsValue) ||
      !goalsValue.every((goal) => {
        if (!goal || typeof goal !== "object") return false;
        const value = goal as SavingsGoal;
        return (
          typeof value.id === "string" &&
          typeof value.name === "string" &&
          !!value.name.trim() &&
          value.name.length <= 120 &&
          Number.isSafeInteger(value.targetAmount) &&
          value.targetAmount > 0 &&
          typeof value.startDate === "string" &&
          validDate(value.startDate) &&
          (value.targetDate === undefined ||
            (typeof value.targetDate === "string" &&
              validDate(value.targetDate) &&
              value.targetDate >= value.startDate)) &&
          (value.monthlyTarget === undefined ||
            (Number.isSafeInteger(value.monthlyTarget) &&
              value.monthlyTarget > 0)) &&
          (value.destination === undefined ||
            typeof value.destination === "string") &&
          typeof value.active === "boolean" &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  if (
    depositsValue !== undefined &&
    (!Array.isArray(depositsValue) ||
      !depositsValue.every((deposit) => {
        if (!deposit || typeof deposit !== "object") return false;
        const value = deposit as SavingsDeposit;
        return (
          typeof value.id === "string" &&
          typeof value.goalId === "string" &&
          Number.isSafeInteger(value.amount) &&
          value.amount > 0 &&
          typeof value.depositDate === "string" &&
          validDate(value.depositDate) &&
          (value.referenceNumber === undefined ||
            typeof value.referenceNumber === "string") &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  return true;
}

export function savingsGoalSnapshot(
  goal: SavingsGoal,
  deposits: SavingsDeposit[],
  asOfDate: string,
): SavingsGoalSnapshot {
  const relevant = deposits
    .filter((deposit) => deposit.goalId === goal.id)
    .toSorted(
      (a, b) =>
        b.depositDate.localeCompare(a.depositDate) || b.id.localeCompare(a.id),
    );
  const saved = relevant.reduce((sum, deposit) => sum + deposit.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const month = asOfDate.slice(0, 7);
  const currentMonthSaved = relevant
    .filter((deposit) => deposit.depositDate.startsWith(month))
    .reduce((sum, deposit) => sum + deposit.amount, 0);
  const status: SavingsGoalStatus =
    remaining === 0
      ? "Completed"
      : !goal.active
        ? "Paused"
        : goal.targetDate && goal.targetDate < asOfDate
          ? "Past due"
          : "Active";

  return {
    goal,
    saved,
    remaining,
    progressRate:
      goal.targetAmount > 0
        ? Math.min(100, (saved / goal.targetAmount) * 100)
        : 0,
    status,
    currentMonthSaved,
    monthlyTargetProgress:
      goal.monthlyTarget && goal.monthlyTarget > 0
        ? (currentMonthSaved / goal.monthlyTarget) * 100
        : 0,
    ...(relevant[0] ? { lastDeposit: relevant[0] } : {}),
  };
}

export function savingsDashboardSnapshot(
  goals: SavingsGoal[],
  deposits: SavingsDeposit[],
  asOfDate: string,
) {
  const snapshots = goals.map((goal) =>
    savingsGoalSnapshot(goal, deposits, asOfDate),
  );
  return {
    snapshots,
    totalTargets: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.goal.targetAmount,
      0,
    ),
    totalSaved: snapshots.reduce((sum, snapshot) => sum + snapshot.saved, 0),
    totalRemaining: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.remaining,
      0,
    ),
    activeCount: snapshots.filter((snapshot) => snapshot.status === "Active")
      .length,
    completedCount: snapshots.filter(
      (snapshot) => snapshot.status === "Completed",
    ).length,
    pastDueCount: snapshots.filter(
      (snapshot) => snapshot.status === "Past due",
    ).length,
  };
}

export function savingsHistoryYears(
  deposits: SavingsDeposit[],
  currentYear = new Date().getFullYear(),
) {
  return [
    ...new Set([
      currentYear,
      ...deposits.map((deposit) => Number(deposit.depositDate.slice(0, 4))),
    ]),
  ]
    .filter(Number.isInteger)
    .toSorted((a, b) => b - a);
}

export function savingsMonthlyHistory(
  deposits: SavingsDeposit[],
  year: number,
  goalId?: string,
) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const entries = deposits.filter(
      (deposit) =>
        deposit.depositDate.startsWith(period) &&
        (!goalId || deposit.goalId === goalId),
    );
    return {
      period,
      month,
      amount: entries.reduce((sum, entry) => sum + entry.amount, 0),
      count: entries.length,
    };
  });
}
