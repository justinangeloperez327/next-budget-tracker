import test from "node:test";
import assert from "node:assert/strict";
import {
  savingsDashboardSnapshot,
  savingsGoalSnapshot,
  savingsHistoryYears,
  savingsMonthlyHistory,
  validSavingsData,
  type SavingsDeposit,
  type SavingsGoal,
} from "../src/lib/savings.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const goal: SavingsGoal = {
  id: "16161616-aaaa-4161-8161-161616161616",
  name: "Emergency fund",
  targetAmount: 1000000,
  startDate: "2026-01-01",
  targetDate: "2026-12-31",
  monthlyTarget: 100000,
  destination: "UAE Savings Bank",
  active: true,
};

const deposits: SavingsDeposit[] = [
  {
    id: "17171717-bbbb-4171-8171-171717171717",
    goalId: goal.id,
    amount: 200000,
    depositDate: "2026-09-20",
    referenceNumber: "SAVE-001",
  },
  {
    id: "18181818-cccc-4181-8181-181818181818",
    goalId: goal.id,
    amount: 150000,
    depositDate: "2026-10-05",
  },
];

test("savings goal values validate", () => {
  assert.equal(validSavingsData([goal], deposits), true);
  assert.equal(
    validSavingsData([{ ...goal, targetAmount: 0 }], deposits),
    false,
  );
  assert.equal(
    validSavingsData([{ ...goal, targetDate: "2025-12-31" }], deposits),
    false,
  );
  assert.equal(
    validSavingsData([goal], [{ ...deposits[0], depositDate: "2026-02-31" }]),
    false,
  );
});

test("savings goal snapshot calculates progress and monthly target", () => {
  const snapshot = savingsGoalSnapshot(goal, deposits, "2026-10-08");

  assert.equal(snapshot.saved, 350000);
  assert.equal(snapshot.remaining, 650000);
  assert.equal(snapshot.progressRate, 35);
  assert.equal(snapshot.currentMonthSaved, 150000);
  assert.equal(snapshot.monthlyTargetProgress, 150);
  assert.equal(snapshot.lastDeposit?.depositDate, "2026-10-05");
  assert.equal(snapshot.status, "Active");
});

test("savings goal status handles completed past-due and paused goals", () => {
  assert.equal(
    savingsGoalSnapshot(
      { ...goal, targetAmount: 350000 },
      deposits,
      "2026-10-08",
    ).status,
    "Completed",
  );
  assert.equal(
    savingsGoalSnapshot(
      { ...goal, targetDate: "2026-09-30" },
      deposits,
      "2026-10-08",
    ).status,
    "Past due",
  );
  assert.equal(
    savingsGoalSnapshot(
      { ...goal, active: false },
      deposits,
      "2026-10-08",
    ).status,
    "Paused",
  );
});

test("savings dashboard aggregates targets and balances", () => {
  const second: SavingsGoal = {
    ...goal,
    id: "19191919-dddd-4191-8191-191919191919",
    name: "Travel fund",
    targetAmount: 500000,
    targetDate: undefined,
  };
  const dashboard = savingsDashboardSnapshot(
    [goal, second],
    deposits,
    "2026-10-08",
  );

  assert.equal(dashboard.totalTargets, 1500000);
  assert.equal(dashboard.totalSaved, 350000);
  assert.equal(dashboard.totalRemaining, 1150000);
  assert.equal(dashboard.activeCount, 2);
  assert.equal(dashboard.completedCount, 0);
});

test("savings history aggregates multiple deposits per month", () => {
  const months = savingsMonthlyHistory(deposits, 2026, goal.id);
  assert.equal(months[8].amount, 200000);
  assert.equal(months[9].amount, 150000);
  assert.equal(months[9].count, 1);
  assert.deepEqual(savingsHistoryYears(deposits, 2027), [2027, 2026]);
});

test("workspace validates savings ownership and prevents over-saving target", () => {
  const base = {
    expenses: [],
    budgets: {},
    categoryBudgets: {},
    governmentAccounts: [],
    governmentContributions: [],
    mp2Accounts: [],
    mp2Deposits: [],
    recurringBills: [],
    billPayments: [],
    debts: [],
    debtPayments: [],
    savingsGoals: [goal],
    savingsDeposits: deposits,
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(
    validWorkspace({
      ...base,
      savingsDeposits: [
        {
          ...deposits[0],
          goalId: "20202020-eeee-4202-8202-202020202020",
        },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      savingsDeposits: [
        {
          ...deposits[0],
          amount: 900000,
        },
        {
          ...deposits[1],
          amount: 200000,
        },
      ],
    }),
    false,
  );
});
