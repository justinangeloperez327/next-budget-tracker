"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  contributionStatuses,
  phpMoney,
  contributionSummary,
  contributionYearHistory,
  contributionYears,
} from "@/lib/government";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const historyStatuses = [
  "All",
  ...contributionStatuses,
  "No record",
] as const;

function monthName(month: number, format: "short" | "long" = "long") {
  return new Intl.DateTimeFormat("en-PH", {
    month: format,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function statusClass(status: string) {
  if (status === "Missed") return "text-destructive";
  if (status === "Paid") return "text-foreground";
  return "text-muted-foreground";
}

export function PagIbigContributionHistory() {
  const { data } = useBudget();
  const account = data.governmentAccounts?.find(
    (entry) => entry.provider === "PAGIBIG",
  );
  const contributions = useMemo(
    () =>
      (data.governmentContributions ?? []).filter(
        (entry) => entry.accountId === account?.id,
      ),
    [account?.id, data.governmentContributions],
  );
  const years = useMemo(
    () => contributionYears(account, contributions),
    [account, contributions],
  );
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [statusFilter, setStatusFilter] =
    useState<(typeof historyStatuses)[number]>("All");

  const history = useMemo(
    () => contributionYearHistory(account, contributions, year),
    [account, contributions, year],
  );
  const summary = contributionSummary(account, contributions, year);
  const recordedMonths = history.filter((entry) => entry.contribution).length;
  const noRecordMonths = 12 - recordedMonths;
  const visibleHistory =
    statusFilter === "All"
      ? history
      : history.filter((entry) => entry.status === statusFilter);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pag-IBIG contribution history</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {year} contribution record
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review every contribution month, payment status, reference or
            receipt number, and notes.
          </p>
          <Link
            href="/pagibig"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Back to Pag-IBIG tracker
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="pagibig-history-year">Year</Label>
            <select
              id="pagibig-history-year"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagibig-history-status">Status</Label>
            <select
              id="pagibig-history-status"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as (typeof historyStatuses)[number],
                )
              }
            >
              {historyStatuses.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!account && (
        <Card className="mt-6">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Create your Pag-IBIG profile first before recording contribution
              history.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(summary.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {summary.paidMonths}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending / missed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {summary.pendingMonths + summary.missedMonths}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.pendingMonths} pending · {summary.missedMonths} missed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recorded months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {recordedMonths} / 12
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {noRecordMonths} with no record
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Year overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {history.map((entry) => (
              <div className="rounded-lg border p-3" key={entry.period}>
                <p className="text-xs text-muted-foreground">
                  {monthName(entry.month, "short")}
                </p>
                <p
                  className={`mt-2 text-sm font-medium ${statusClass(entry.status)}`}
                >
                  {entry.status}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {entry.contribution
                    ? phpMoney(entry.contribution.amount)
                    : "—"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            “No record” is informational and is not automatically treated as a
            missed contribution.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Contribution details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment date</TableHead>
                  <TableHead>Reference / receipt no.</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleHistory.map((entry) => (
                  <TableRow key={entry.period}>
                    <TableCell className="font-medium">
                      {monthName(entry.month)} {year}
                    </TableCell>
                    <TableCell>
                      <span className={statusClass(entry.status)}>
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.contribution
                        ? phpMoney(entry.contribution.amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {entry.contribution?.paymentDate ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-52 break-words">
                      {entry.contribution?.referenceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words text-muted-foreground">
                      {entry.contribution?.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleHistory.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No months match this status filter.
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
