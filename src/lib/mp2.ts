export const mp2DividendOptions = ["Compounded", "Annual"] as const;
export type Mp2DividendOption = (typeof mp2DividendOptions)[number];

export type Mp2Account = {
  id: string;
  name: string;
  accountNumber?: string;
  dividendOption: Mp2DividendOption;
  initialPaymentDate?: string;
  monthlyTarget?: number;
  active: boolean;
};

export type Mp2Deposit = {
  id: string;
  accountId: string;
  paymentDate: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
};

export type Mp2MaturityStatus = "Not started" | "Active" | "Matured";

export type Mp2AccountSnapshot = {
  account: Mp2Account;
  totalSaved: number;
  ytdSaved: number;
  currentMonthSaved: number;
  monthlyTargetProgress: number;
  lastDeposit?: Mp2Deposit;
  maturityDate?: string;
  maturityStatus: Mp2MaturityStatus;
};

const DATE_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export function validMp2Date(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validMp2Data(accountsValue: unknown, depositsValue: unknown) {
  if (
    accountsValue !== undefined &&
    (!Array.isArray(accountsValue) ||
      !accountsValue.every((account) => {
        if (!account || typeof account !== "object") return false;
        const value = account as Mp2Account;
        return (
          typeof value.id === "string" &&
          typeof value.name === "string" &&
          !!value.name.trim() &&
          value.name.length <= 80 &&
          mp2DividendOptions.includes(value.dividendOption) &&
          typeof value.active === "boolean" &&
          (value.accountNumber === undefined ||
            typeof value.accountNumber === "string") &&
          (value.initialPaymentDate === undefined ||
            (typeof value.initialPaymentDate === "string" &&
              validMp2Date(value.initialPaymentDate))) &&
          (value.monthlyTarget === undefined ||
            (Number.isSafeInteger(value.monthlyTarget) &&
              value.monthlyTarget >= 0))
        );
      }))
  )
    return false;

  if (
    depositsValue !== undefined &&
    (!Array.isArray(depositsValue) ||
      !depositsValue.every((deposit) => {
        if (!deposit || typeof deposit !== "object") return false;
        const value = deposit as Mp2Deposit;
        return (
          typeof value.id === "string" &&
          typeof value.accountId === "string" &&
          typeof value.paymentDate === "string" &&
          validMp2Date(value.paymentDate) &&
          Number.isSafeInteger(value.amount) &&
          value.amount > 0 &&
          (value.referenceNumber === undefined ||
            typeof value.referenceNumber === "string") &&
          (value.notes === undefined || typeof value.notes === "string")
        );
      }))
  )
    return false;

  return true;
}

export function mp2MaturityDate(initialPaymentDate: string | undefined) {
  if (!initialPaymentDate || !validMp2Date(initialPaymentDate)) return undefined;
  const [year, month, day] = initialPaymentDate.split("-").map(Number);
  const targetYear = year + 5;
  const maxDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return [
    String(targetYear).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(Math.min(day, maxDay)).padStart(2, "0"),
  ].join("-");
}

export function mp2AccountSnapshot(
  account: Mp2Account,
  deposits: Mp2Deposit[],
  asOfDate: string,
): Mp2AccountSnapshot {
  const relevant = deposits
    .filter((deposit) => deposit.accountId === account.id)
    .toSorted(
      (a, b) =>
        b.paymentDate.localeCompare(a.paymentDate) || b.id.localeCompare(a.id),
    );
  const year = asOfDate.slice(0, 4);
  const month = asOfDate.slice(0, 7);
  const maturityDate = mp2MaturityDate(account.initialPaymentDate);
  const currentMonthSaved = relevant
    .filter((deposit) => deposit.paymentDate.startsWith(month))
    .reduce((sum, deposit) => sum + deposit.amount, 0);

  return {
    account,
    totalSaved: relevant.reduce((sum, deposit) => sum + deposit.amount, 0),
    ytdSaved: relevant
      .filter((deposit) => deposit.paymentDate.startsWith(year))
      .reduce((sum, deposit) => sum + deposit.amount, 0),
    currentMonthSaved,
    monthlyTargetProgress:
      account.monthlyTarget && account.monthlyTarget > 0
        ? (currentMonthSaved / account.monthlyTarget) * 100
        : 0,
    ...(relevant[0] ? { lastDeposit: relevant[0] } : {}),
    ...(maturityDate ? { maturityDate } : {}),
    maturityStatus: !maturityDate
      ? "Not started"
      : maturityDate <= asOfDate
        ? "Matured"
        : "Active",
  };
}

export function mp2HistoryYears(
  deposits: Mp2Deposit[],
  currentYear = new Date().getFullYear(),
) {
  return [
    ...new Set([
      currentYear,
      ...deposits.map((deposit) => Number(deposit.paymentDate.slice(0, 4))),
    ]),
  ]
    .filter(Number.isInteger)
    .toSorted((a, b) => b - a);
}

export function mp2MonthlyHistory(
  deposits: Mp2Deposit[],
  year: number,
  accountId?: string,
) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const entries = deposits.filter(
      (deposit) =>
        deposit.paymentDate.startsWith(period) &&
        (!accountId || deposit.accountId === accountId),
    );
    return {
      period,
      month,
      amount: entries.reduce((sum, entry) => sum + entry.amount, 0),
      count: entries.length,
    };
  });
}
