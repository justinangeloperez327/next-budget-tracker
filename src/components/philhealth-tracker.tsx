"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  contributionFrequencies,
  contributionStatuses,
  phpMoney,
  contributionDashboardSnapshot,
  philHealthMemberTypes,
  type GovernmentAccount,
  type GovernmentContribution,
} from "@/lib/government";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function toCentavos(value: FormDataEntryValue | null, optional = false) {
  if (optional && String(value ?? "").trim() === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  const centavos = Math.round(number * 100);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function periodLabel(period: string | undefined) {
  if (!period) return "Not scheduled";
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function PhilHealthProfileForm({
  account,
}: {
  account: GovernmentAccount | undefined;
}) {
  const { data, save, saving, error } = useBudget();
  const [status, setStatus] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">PhilHealth profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus("");
            const formData = new FormData(event.currentTarget);
            const monthlyTarget = toCentavos(
              formData.get("monthly-target"),
              true,
            );
            if (monthlyTarget === null) {
              setStatus("Enter a valid monthly contribution target.");
              return;
            }

            const id = account?.id ?? crypto.randomUUID();
            const nextAccount: GovernmentAccount = {
              id,
              provider: "PHILHEALTH",
              memberType: String(
                formData.get("member-type"),
              ) as GovernmentAccount["memberType"],
              frequency: String(
                formData.get("frequency"),
              ) as GovernmentAccount["frequency"],
              active: formData.get("active") === "on",
              ...(optionalText(formData.get("philhealth-number"))
                ? {
                    accountIdentifier: optionalText(
                      formData.get("philhealth-number"),
                    ),
                  }
                : {}),
              ...(monthlyTarget === undefined ? {} : { monthlyTarget }),
            };

            const saved = await save({
              ...data,
              governmentAccounts: [
                ...(data.governmentAccounts ?? []).filter(
                  (entry) => entry.provider !== "PHILHEALTH",
                ),
                nextAccount,
              ],
              governmentContributions: data.governmentContributions ?? [],
            });
            if (saved) setStatus("PhilHealth profile saved.");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="philhealth-member-type">Membership type</Label>
              <select
                id="philhealth-member-type"
                name="member-type"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue={account?.memberType ?? "OFW / Migrant Worker"}
              >
                {philHealthMemberTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-frequency">Contribution frequency</Label>
              <select
                id="philhealth-frequency"
                name="frequency"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue={account?.frequency ?? "Monthly"}
              >
                {contributionFrequencies.map((frequency) => (
                  <option key={frequency}>{frequency}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-number">PhilHealth number</Label>
              <Input
                id="philhealth-number"
                name="philhealth-number"
                maxLength={40}
                autoComplete="off"
                defaultValue={account?.accountIdentifier ?? ""}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-target">
                Monthly contribution target (PHP)
              </Label>
              <Input
                id="monthly-target"
                name="monthly-target"
                type="number"
                min="0"
                max="99999999"
                step="0.01"
                defaultValue={
                  account?.monthlyTarget === undefined
                    ? ""
                    : account.monthlyTarget / 100
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={account?.active ?? true}
              className="size-4"
            />
            Active PhilHealth membership
          </label>
          <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            The contribution target is your own planning value. This tracker
            does not calculate official PhilHealth premium rates.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saving || !!error}>Save PhilHealth profile</Button>
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ContributionForm({
  account,
}: {
  account: GovernmentAccount | undefined;
}) {
  const { data, save, saving, error } = useBudget();
  const [status, setStatus] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Record contribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus("");
            if (!account) {
              setStatus("Save your PhilHealth profile first.");
              return;
            }
            const form = event.currentTarget;
            const formData = new FormData(form);
            const amount = toCentavos(formData.get("amount"));
            if (amount === null || amount === undefined) {
              setStatus("Enter a valid contribution amount.");
              return;
            }
            const contributionStatus = String(
              formData.get("status"),
            ) as GovernmentContribution["status"];
            const paymentDate = optionalText(formData.get("payment-date"));
            if (contributionStatus === "Paid" && !paymentDate) {
              setStatus("Enter the payment date for a paid contribution.");
              return;
            }

            const contribution: GovernmentContribution = {
              id: crypto.randomUUID(),
              accountId: account.id,
              period: String(formData.get("period")),
              amount,
              status: contributionStatus,
              ...(paymentDate ? { paymentDate } : {}),
              ...(optionalText(formData.get("reference"))
                ? { referenceNumber: optionalText(formData.get("reference")) }
                : {}),
              ...(optionalText(formData.get("notes"))
                ? { notes: optionalText(formData.get("notes")) }
                : {}),
            };

            const saved = await save({
              ...data,
              governmentAccounts: data.governmentAccounts ?? [],
              governmentContributions: [
                ...(data.governmentContributions ?? []),
                contribution,
              ],
            });
            if (saved) {
              form.reset();
              setStatus("Contribution recorded.");
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="philhealth-period">Contribution month</Label>
              <Input
                id="philhealth-period"
                name="period"
                type="month"
                required
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-amount">Amount (PHP)</Label>
              <Input
                id="philhealth-amount"
                name="amount"
                type="number"
                min="0"
                max="99999999"
                step="0.01"
                required
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-status">Status</Label>
              <select
                id="philhealth-status"
                name="status"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue="Paid"
                disabled={!account}
              >
                {contributionStatuses.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-payment-date">Payment date</Label>
              <Input
                id="philhealth-payment-date"
                name="payment-date"
                type="date"
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-reference">Reference number</Label>
              <Input
                id="philhealth-reference"
                name="reference"
                maxLength={80}
                placeholder="Optional"
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philhealth-notes">Notes</Label>
              <Input
                id="philhealth-notes"
                name="notes"
                maxLength={500}
                placeholder="Optional"
                disabled={!account}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!account || saving || !!error}>
              Add contribution
            </Button>
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PhilHealthTracker() {
  const { data, save, saving } = useBudget();
  const account = data.governmentAccounts?.find(
    (entry) => entry.provider === "PHILHEALTH",
  );
  const contributions = useMemo(
    () =>
      (data.governmentContributions ?? [])
        .filter((entry) => entry.accountId === account?.id)
        .toSorted(
          (a, b) =>
            b.period.localeCompare(a.period) ||
            (b.paymentDate ?? "").localeCompare(a.paymentDate ?? ""),
        ),
    [account?.id, data.governmentContributions],
  );
  const today = new Date().toLocaleDateString("en-CA");
  const dashboard = contributionDashboardSnapshot(account, contributions, today);

  async function removeContribution(id: string) {
    await save({
      ...data,
      governmentAccounts: data.governmentAccounts ?? [],
      governmentContributions: (data.governmentContributions ?? []).filter(
        (entry) => entry.id !== id,
      ),
    });
  }

  return (
    <>
      <div>
        <p className="eyebrow">Government contributions</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          PhilHealth dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Keep your PhilHealth membership details and contribution records together.
          Official rate calculations are intentionally not applied in this
          foundation.
        </p>
        <Link
          href="/philhealth/history"
          className="mt-3 inline-block text-sm underline underline-offset-4"
        >
          View full contribution history
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YTD contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium tabular-nums">
              {phpMoney(dashboard.ytdPaid)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.paidExpectedPeriods} / {dashboard.expectedDuePeriods} expected periods paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">
              {dashboard.lastPayment
                ? periodLabel(dashboard.lastPayment.period)
                : "No payment yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.lastPayment
                ? `${phpMoney(dashboard.lastPayment.amount)} · ${dashboard.lastPayment.paymentDate}`
                : "Record a paid contribution to populate this card"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next expected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">
              {account?.active
                ? periodLabel(dashboard.nextExpectedPeriod)
                : "Membership inactive"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {account
                ? `${account.frequency} contribution schedule`
                : "Save your PhilHealth profile to create a schedule"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contribution gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-medium tabular-nums ${
                dashboard.gapPeriods.length > 0 ? "text-destructive" : ""
              }`}
            >
              {dashboard.gapPeriods.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unrecorded expected past periods
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {dashboard.year} expected-period progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>
                {dashboard.paidExpectedPeriods} paid of{" "}
                {dashboard.expectedDuePeriods} expected through this month
              </span>
              <span className="tabular-nums text-muted-foreground">
                {dashboard.progressRate.toFixed(1)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="PhilHealth expected contribution periods paid"
              aria-valuenow={Math.round(dashboard.progressRate)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary"
                style={{ width: Math.min(100, dashboard.progressRate) + "%" }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Progress is based on your saved {account?.frequency.toLowerCase() ?? "contribution"} schedule,
              not on an official PhilHealth premium calculation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Unrecorded gaps</p>
              <p className={dashboard.gapPeriods.length ? "mt-1 text-destructive" : "mt-1"}>
                {dashboard.gapPeriods.length
                  ? dashboard.gapPeriods.map(periodLabel).join(", ")
                  : "No past expected-period gaps"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending records</p>
              <p className="mt-1">
                {dashboard.pendingPeriods.length
                  ? dashboard.pendingPeriods.map(periodLabel).join(", ")
                  : "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Explicitly missed</p>
              <p className={dashboard.missedPeriods.length ? "mt-1 text-destructive" : "mt-1"}>
                {dashboard.missedPeriods.length
                  ? dashboard.missedPeriods.map(periodLabel).join(", ")
                  : "None"}
              </p>
            </div>
            <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
              A gap only means no record exists for an expected past period. It
              is not automatically classified as a missed PhilHealth contribution.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <PhilHealthProfileForm
          key={
            account
              ? [
                  account.id,
                  account.memberType,
                  account.frequency,
                  account.accountIdentifier,
                  account.monthlyTarget,
                  account.active,
                ].join(":")
              : "new"
          }
          account={account}
        />
        <ContributionForm account={account} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Recent contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.length ? (
                  contributions.slice(0, 12).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.period}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {phpMoney(entry.amount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.status === "Missed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell>{entry.paymentDate ?? "—"}</TableCell>
                      <TableCell>{entry.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => void removeContribution(entry.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No PhilHealth contribution records yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
