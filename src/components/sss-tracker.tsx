"use client";

import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  contributionFrequencies,
  contributionStatuses,
  phpMoney,
  sssContributionSummary,
  sssMemberTypes,
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

function SssProfileForm({
  account,
}: {
  account: GovernmentAccount | undefined;
}) {
  const { data, save, saving, error } = useBudget();
  const [status, setStatus] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">SSS profile</CardTitle>
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
              provider: "SSS",
              memberType: String(
                formData.get("member-type"),
              ) as GovernmentAccount["memberType"],
              frequency: String(
                formData.get("frequency"),
              ) as GovernmentAccount["frequency"],
              active: formData.get("active") === "on",
              ...(optionalText(formData.get("sss-number"))
                ? {
                    accountIdentifier: optionalText(
                      formData.get("sss-number"),
                    ),
                  }
                : {}),
              ...(monthlyTarget === undefined ? {} : { monthlyTarget }),
            };

            const saved = await save({
              ...data,
              governmentAccounts: [
                ...(data.governmentAccounts ?? []).filter(
                  (entry) => entry.provider !== "SSS",
                ),
                nextAccount,
              ],
              governmentContributions: data.governmentContributions ?? [],
            });
            if (saved) setStatus("SSS profile saved.");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sss-member-type">Membership type</Label>
              <select
                id="sss-member-type"
                name="member-type"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue={account?.memberType ?? "OFW"}
              >
                {sssMemberTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sss-frequency">Contribution frequency</Label>
              <select
                id="sss-frequency"
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
              <Label htmlFor="sss-number">SSS number</Label>
              <Input
                id="sss-number"
                name="sss-number"
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
            Active SSS membership
          </label>
          <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            The contribution target is your own planning value. This tracker
            does not calculate official SSS contribution rates.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saving || !!error}>Save SSS profile</Button>
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
              setStatus("Save your SSS profile first.");
              return;
            }
            const form = event.currentTarget;
            const formData = new FormData(form);
            const amount = toCentavos(formData.get("amount"));
            if (amount === null) {
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
              <Label htmlFor="sss-period">Contribution month</Label>
              <Input
                id="sss-period"
                name="period"
                type="month"
                required
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sss-amount">Amount (PHP)</Label>
              <Input
                id="sss-amount"
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
              <Label htmlFor="sss-status">Status</Label>
              <select
                id="sss-status"
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
              <Label htmlFor="sss-payment-date">Payment date</Label>
              <Input
                id="sss-payment-date"
                name="payment-date"
                type="date"
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sss-reference">Reference number</Label>
              <Input
                id="sss-reference"
                name="reference"
                maxLength={80}
                placeholder="Optional"
                disabled={!account}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sss-notes">Notes</Label>
              <Input
                id="sss-notes"
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

export function SssTracker() {
  const { data, save, saving } = useBudget();
  const account = data.governmentAccounts?.find(
    (entry) => entry.provider === "SSS",
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
  const year = new Date().getFullYear();
  const summary = sssContributionSummary(account, contributions, year);

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
          SSS tracker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Keep your SSS membership details and contribution records together.
          Official rate calculations are intentionally not applied in this
          foundation.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">
              {account?.memberType ?? "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium tabular-nums">
              {account?.monthlyTarget === undefined
                ? "Not set"
                : phpMoney(account.monthlyTarget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid in {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium tabular-nums">
              {phpMoney(summary.totalPaid)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.paidMonths} paid record
              {summary.paidMonths === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium tabular-nums">
              {summary.pendingMonths + summary.missedMonths}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.pendingMonths} pending · {summary.missedMonths} missed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SssProfileForm
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
                      No SSS contribution records yet.
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
