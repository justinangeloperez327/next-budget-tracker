export const remittanceStatuses = ["Pending", "Completed"] as const;
export const remittanceDestinationTypes = [
  "Family / person",
  "Own account",
] as const;

export type RemittanceStatus = (typeof remittanceStatuses)[number];
export type RemittanceDestinationType =
  (typeof remittanceDestinationTypes)[number];

export type Remittance = {
  id: string;
  recipient: string;
  destinationType: RemittanceDestinationType;
  provider?: string;
  sentAmount: number;
  feeAmount: number;
  receivedAmount?: number;
  transferDate: string;
  status: RemittanceStatus;
  principalAsExpense: boolean;
  category: string;
  expenseId?: string;
  referenceNumber?: string;
  notes?: string;
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

export function remittanceExpenseAmount(remittance: Remittance) {
  return (
    (remittance.principalAsExpense ? remittance.sentAmount : 0) +
    remittance.feeAmount
  );
}

export function remittanceEffectiveRate(remittance: Remittance) {
  if (
    remittance.status !== "Completed" ||
    !remittance.receivedAmount ||
    remittance.sentAmount <= 0
  )
    return undefined;
  return remittance.receivedAmount / remittance.sentAmount;
}

export function validRemittanceData(value: unknown) {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const remittance = entry as Remittance;
    return (
      typeof remittance.id === "string" &&
      typeof remittance.recipient === "string" &&
      !!remittance.recipient.trim() &&
      remittance.recipient.length <= 120 &&
      remittanceDestinationTypes.includes(remittance.destinationType) &&
      (remittance.provider === undefined ||
        typeof remittance.provider === "string") &&
      Number.isSafeInteger(remittance.sentAmount) &&
      remittance.sentAmount > 0 &&
      Number.isSafeInteger(remittance.feeAmount) &&
      remittance.feeAmount >= 0 &&
      (remittance.receivedAmount === undefined ||
        (Number.isSafeInteger(remittance.receivedAmount) &&
          remittance.receivedAmount > 0)) &&
      typeof remittance.transferDate === "string" &&
      validDate(remittance.transferDate) &&
      remittanceStatuses.includes(remittance.status) &&
      (remittance.status !== "Completed" ||
        remittance.receivedAmount !== undefined) &&
      typeof remittance.principalAsExpense === "boolean" &&
      typeof remittance.category === "string" &&
      (remittance.expenseId === undefined ||
        typeof remittance.expenseId === "string") &&
      (remittance.referenceNumber === undefined ||
        typeof remittance.referenceNumber === "string") &&
      (remittance.notes === undefined || typeof remittance.notes === "string")
    );
  });
}

export function remittanceMonthSummary(
  remittances: Remittance[],
  month: string,
) {
  const entries = remittances.filter((entry) =>
    entry.transferDate.startsWith(month),
  );
  const completed = entries.filter((entry) => entry.status === "Completed");
  const sentAmount = entries.reduce((sum, entry) => sum + entry.sentAmount, 0);
  const feeAmount = entries.reduce((sum, entry) => sum + entry.feeAmount, 0);
  const receivedAmount = completed.reduce(
    (sum, entry) => sum + (entry.receivedAmount ?? 0),
    0,
  );
  const completedSentAmount = completed.reduce(
    (sum, entry) => sum + entry.sentAmount,
    0,
  );

  return {
    entries,
    count: entries.length,
    completedCount: completed.length,
    pendingCount: entries.length - completed.length,
    sentAmount,
    feeAmount,
    receivedAmount,
    supportAmount: entries
      .filter((entry) => entry.principalAsExpense)
      .reduce((sum, entry) => sum + entry.sentAmount, 0),
    ownTransferAmount: entries
      .filter((entry) => !entry.principalAsExpense)
      .reduce((sum, entry) => sum + entry.sentAmount, 0),
    effectiveRate:
      completedSentAmount > 0 ? receivedAmount / completedSentAmount : undefined,
  };
}

export function remittanceHistoryYears(
  remittances: Remittance[],
  currentYear = new Date().getFullYear(),
) {
  return [
    ...new Set([
      currentYear,
      ...remittances.map((entry) => Number(entry.transferDate.slice(0, 4))),
    ]),
  ]
    .filter(Number.isInteger)
    .toSorted((a, b) => b - a);
}

export function remittanceMonthlyHistory(
  remittances: Remittance[],
  year: number,
) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const summary = remittanceMonthSummary(remittances, period);
    return {
      period,
      month,
      ...summary,
    };
  });
}

export function phpMoney(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavos / 100);
}
