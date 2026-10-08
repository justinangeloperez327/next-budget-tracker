export const governmentProviders = ["SSS"] as const;
export type GovernmentProvider = (typeof governmentProviders)[number];

export const sssMemberTypes = [
  "Employee",
  "Self-employed",
  "Voluntary",
  "OFW",
] as const;
export type SssMemberType = (typeof sssMemberTypes)[number];

export const contributionFrequencies = ["Monthly", "Quarterly"] as const;
export type ContributionFrequency = (typeof contributionFrequencies)[number];

export const contributionStatuses = [
  "Paid",
  "Pending",
  "Missed",
  "Not Required",
] as const;
export type ContributionStatus = (typeof contributionStatuses)[number];

export type GovernmentAccount = {
  id: string;
  provider: GovernmentProvider;
  memberType: SssMemberType;
  accountIdentifier?: string;
  monthlyTarget?: number;
  frequency: ContributionFrequency;
  active: boolean;
};

export type GovernmentContribution = {
  id: string;
  accountId: string;
  period: string;
  amount: number;
  paymentDate?: string;
  status: ContributionStatus;
  referenceNumber?: string;
  notes?: string;
};

export type SssContributionSummary = {
  year: number;
  totalPaid: number;
  paidMonths: number;
  pendingMonths: number;
  missedMonths: number;
  notRequiredMonths: number;
};

export type SssContributionHistoryMonth = {
  period: string;
  month: number;
  status: ContributionStatus | "No record";
  contribution?: GovernmentContribution;
};

export type SssDashboardSnapshot = {
  year: number;
  currentPeriod: string;
  ytdPaid: number;
  expectedDuePeriods: number;
  paidExpectedPeriods: number;
  progressRate: number;
  lastPayment?: GovernmentContribution;
  nextExpectedPeriod?: string;
  gapPeriods: string[];
  pendingPeriods: string[];
  missedPeriods: string[];
};

const MONTH_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validGovernmentData(
  accountsValue: unknown,
  contributionsValue: unknown,
) {
  if (
    accountsValue !== undefined &&
    (!Array.isArray(accountsValue) ||
      !accountsValue.every((account) => {
        if (!account || typeof account !== "object") return false;
        const a = account as GovernmentAccount;
        return (
          typeof a.id === "string" &&
          governmentProviders.includes(a.provider) &&
          sssMemberTypes.includes(a.memberType) &&
          contributionFrequencies.includes(a.frequency) &&
          typeof a.active === "boolean" &&
          (a.accountIdentifier === undefined ||
            typeof a.accountIdentifier === "string") &&
          (a.monthlyTarget === undefined ||
            (Number.isSafeInteger(a.monthlyTarget) && a.monthlyTarget >= 0))
        );
      }))
  )
    return false;

  if (
    contributionsValue !== undefined &&
    (!Array.isArray(contributionsValue) ||
      !contributionsValue.every((contribution) => {
        if (!contribution || typeof contribution !== "object") return false;
        const c = contribution as GovernmentContribution;
        return (
          typeof c.id === "string" &&
          typeof c.accountId === "string" &&
          MONTH_PATTERN.test(c.period) &&
          Number.isSafeInteger(c.amount) &&
          c.amount >= 0 &&
          contributionStatuses.includes(c.status) &&
          (c.paymentDate === undefined ||
            (typeof c.paymentDate === "string" && validDate(c.paymentDate))) &&
          (c.referenceNumber === undefined ||
            typeof c.referenceNumber === "string") &&
          (c.notes === undefined || typeof c.notes === "string")
        );
      }))
  )
    return false;

  return true;
}

export function sssContributionSummary(
  account: GovernmentAccount | undefined,
  contributions: GovernmentContribution[],
  year: number,
): SssContributionSummary {
  const relevant = account
    ? contributions.filter(
        (contribution) =>
          contribution.accountId === account.id &&
          contribution.period.startsWith(String(year)),
      )
    : [];

  return {
    year,
    totalPaid: relevant
      .filter((contribution) => contribution.status === "Paid")
      .reduce((sum, contribution) => sum + contribution.amount, 0),
    paidMonths: relevant.filter((contribution) => contribution.status === "Paid")
      .length,
    pendingMonths: relevant.filter(
      (contribution) => contribution.status === "Pending",
    ).length,
    missedMonths: relevant.filter(
      (contribution) => contribution.status === "Missed",
    ).length,
    notRequiredMonths: relevant.filter(
      (contribution) => contribution.status === "Not Required",
    ).length,
  };
}

export function sssContributionYears(
  account: GovernmentAccount | undefined,
  contributions: GovernmentContribution[],
  currentYear = new Date().getFullYear(),
) {
  const years = account
    ? contributions
        .filter((contribution) => contribution.accountId === account.id)
        .map((contribution) => Number(contribution.period.slice(0, 4)))
        .filter(Number.isInteger)
    : [];

  return [...new Set([currentYear, ...years])].toSorted((a, b) => b - a);
}

export function sssContributionYearHistory(
  account: GovernmentAccount | undefined,
  contributions: GovernmentContribution[],
  year: number,
): SssContributionHistoryMonth[] {
  const records = new Map(
    (account
      ? contributions.filter(
          (contribution) =>
            contribution.accountId === account.id &&
            contribution.period.startsWith(String(year)),
        )
      : []
    ).map((contribution) => [contribution.period, contribution]),
  );

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const contribution = records.get(period);
    return {
      period,
      month,
      status: contribution?.status ?? "No record",
      ...(contribution ? { contribution } : {}),
    };
  });
}

export function sssExpectedPeriods(
  account: GovernmentAccount | undefined,
  year: number,
) {
  if (!account?.active) return [];
  const months =
    account.frequency === "Quarterly"
      ? [3, 6, 9, 12]
      : Array.from({ length: 12 }, (_, index) => index + 1);

  return months.map(
    (month) => `${year}-${String(month).padStart(2, "0")}`,
  );
}

export function sssDashboardSnapshot(
  account: GovernmentAccount | undefined,
  contributions: GovernmentContribution[],
  asOfDate: string,
): SssDashboardSnapshot {
  const currentPeriod = asOfDate.slice(0, 7);
  const year = Number(currentPeriod.slice(0, 4));
  const accountContributions = account
    ? contributions.filter(
        (contribution) => contribution.accountId === account.id,
      )
    : [];
  const expectedPeriods = sssExpectedPeriods(account, year);
  const contributionByPeriod = new Map(
    accountContributions.map((contribution) => [
      contribution.period,
      contribution,
    ]),
  );
  const dueExpected = expectedPeriods.filter(
    (period) => period <= currentPeriod,
  );
  const paidExpected = dueExpected.filter(
    (period) => contributionByPeriod.get(period)?.status === "Paid",
  );
  const gapPeriods = expectedPeriods.filter(
    (period) => period < currentPeriod && !contributionByPeriod.has(period),
  );
  const pendingPeriods = dueExpected.filter(
    (period) => contributionByPeriod.get(period)?.status === "Pending",
  );
  const missedPeriods = dueExpected.filter(
    (period) => contributionByPeriod.get(period)?.status === "Missed",
  );
  const lastPayment = accountContributions
    .filter(
      (contribution) =>
        contribution.status === "Paid" && !!contribution.paymentDate,
    )
    .toSorted(
      (a, b) =>
        (b.paymentDate ?? "").localeCompare(a.paymentDate ?? "") ||
        b.period.localeCompare(a.period),
    )[0];

  let nextExpectedPeriod: string | undefined;
  if (account?.active) {
    nextExpectedPeriod = expectedPeriods.find((period) => {
      if (period < currentPeriod) return false;
      const status = contributionByPeriod.get(period)?.status;
      return status !== "Paid" && status !== "Not Required";
    });

    if (!nextExpectedPeriod) {
      nextExpectedPeriod = sssExpectedPeriods(account, year + 1)[0];
    }
  }

  return {
    year,
    currentPeriod,
    ytdPaid: accountContributions
      .filter(
        (contribution) =>
          contribution.status === "Paid" &&
          contribution.period.startsWith(String(year)) &&
          contribution.period <= currentPeriod,
      )
      .reduce((sum, contribution) => sum + contribution.amount, 0),
    expectedDuePeriods: dueExpected.length,
    paidExpectedPeriods: paidExpected.length,
    progressRate:
      dueExpected.length > 0
        ? (paidExpected.length / dueExpected.length) * 100
        : 0,
    ...(lastPayment ? { lastPayment } : {}),
    ...(nextExpectedPeriod ? { nextExpectedPeriod } : {}),
    gapPeriods,
    pendingPeriods,
    missedPeriods,
  };
}

export function phpMoney(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavos / 100);
}
