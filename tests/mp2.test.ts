import test from "node:test";
import assert from "node:assert/strict";
import {
  mp2AccountSnapshot,
  mp2HistoryYears,
  mp2MaturityDate,
  mp2MonthlyHistory,
  validMp2Data,
  type Mp2Account,
  type Mp2Deposit,
} from "../src/lib/mp2.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";

const account: Mp2Account = {
  id: "16161616-1616-4161-8161-161616161616",
  name: "MP2 Retirement",
  accountNumber: "123456789012",
  dividendOption: "Compounded",
  initialPaymentDate: "2026-02-28",
  monthlyTarget: 100000,
  active: true,
};

const deposits: Mp2Deposit[] = [
  {
    id: "17171717-1717-4171-8171-171717171717",
    accountId: account.id,
    paymentDate: "2026-08-15",
    amount: 50000,
    referenceNumber: "MP2-001",
  },
  {
    id: "18181818-1818-4181-8181-181818181818",
    accountId: account.id,
    paymentDate: "2026-10-05",
    amount: 75000,
  },
  {
    id: "19191919-1919-4191-8191-191919191919",
    accountId: account.id,
    paymentDate: "2026-10-07",
    amount: 50000,
  },
];

test("MP2 values validate", () => {
  assert.equal(validMp2Data([account], deposits), true);
  assert.equal(
    validMp2Data([{ ...account, dividendOption: "Unknown" }], deposits),
    false,
  );
  assert.equal(
    validMp2Data([account], [{ ...deposits[0], paymentDate: "2026-02-31" }]),
    false,
  );
});

test("MP2 maturity is five years from initial payment", () => {
  assert.equal(mp2MaturityDate("2026-02-28"), "2031-02-28");
  assert.equal(mp2MaturityDate("2024-02-29"), "2029-02-28");
  assert.equal(mp2MaturityDate(undefined), undefined);
});

test("MP2 snapshot totals deposits and monthly target progress", () => {
  const snapshot = mp2AccountSnapshot(account, deposits, "2026-10-08");
  assert.equal(snapshot.totalSaved, 175000);
  assert.equal(snapshot.ytdSaved, 175000);
  assert.equal(snapshot.currentMonthSaved, 125000);
  assert.equal(snapshot.monthlyTargetProgress, 125);
  assert.equal(snapshot.lastDeposit?.paymentDate, "2026-10-07");
  assert.equal(snapshot.maturityDate, "2031-02-28");
  assert.equal(snapshot.maturityStatus, "Active");
});

test("MP2 snapshot detects matured accounts", () => {
  const snapshot = mp2AccountSnapshot(
    { ...account, initialPaymentDate: "2020-01-10" },
    deposits,
    "2026-10-08",
  );
  assert.equal(snapshot.maturityDate, "2025-01-10");
  assert.equal(snapshot.maturityStatus, "Matured");
});

test("MP2 history aggregates multiple deposits in one month", () => {
  const months = mp2MonthlyHistory(deposits, 2026, account.id);
  assert.equal(months[9].period, "2026-10");
  assert.equal(months[9].amount, 125000);
  assert.equal(months[9].count, 2);
  assert.deepEqual(mp2HistoryYears(deposits, 2027), [2027, 2026]);
});

test("workspace validates MP2 ownership and unique account numbers", () => {
  const base = {
    expenses: [],
    budgets: {},
    categoryBudgets: {},
    governmentAccounts: [],
    governmentContributions: [],
    mp2Accounts: [account],
    mp2Deposits: deposits,
  };

  assert.equal(validWorkspace(base), true);
  assert.equal(
    validWorkspace({
      ...base,
      mp2Deposits: [
        {
          ...deposits[0],
          accountId: "20202020-2020-4202-8202-202020202020",
        },
      ],
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      ...base,
      mp2Accounts: [
        account,
        {
          ...account,
          id: "21212121-2121-4212-8212-212121212121",
        },
      ],
    }),
    false,
  );
});
