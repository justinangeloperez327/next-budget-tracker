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

export function phpMoney(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavos / 100);
}
