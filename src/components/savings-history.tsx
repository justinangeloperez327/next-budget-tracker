"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  savingsHistoryYears,
  savingsMonthlyHistory,
} from "@/lib/savings";
import { money } from "@/lib/budget";
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

function monthName(month: number, format: "short" | "long" = "long") {
  return new Intl.DateTimeFormat("en-AE", {
    month: format,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

export function SavingsHistory() {
  const { data } = useBudget();
  const goals = data.savingsGoals ?? [];
  const deposits = useMemo(
    () =>
      (data.savingsDeposits ?? []).toSorted(
        (a, b) =>
          b.depositDate.localeCompare(a.depositDate) ||
          b.id.localeCompare(a.id),
      ),
    [data.savingsDeposits],
  );
  const years = useMemo(() => savingsHistoryYears(deposits), [deposits]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [goalId, setGoalId] = useState("all");
  const filtered = deposits.filter(
    (deposit) =>
      deposit.depositDate.startsWith(String(year)) &&
      (goalId === "all" || deposit.goalId === goalId),
  );
  const months = savingsMonthlyHistory(
    deposits,
    year,
    goalId === "all" ? undefined : goalId,
  );
  const total = filtered.reduce((sum, deposit) => sum + deposit.amount, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Savings history</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {year} savings record
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review savings deposits by goal and month without treating them as
            expenses.
          </p>
          <Link
            href="/savings"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Back to savings goals
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="savings-history-year">Year</Label>
            <select
              id="savings-history-year"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="savings-history-goal">Goal</Label>
            <select
              id="savings-history-goal"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
            >
              <option value="all">All goals</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved in {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {filtered.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {months.filter((month) => month.count > 0).length} / 12
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Monthly savings overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {months.map((month) => (
              <div className="rounded-lg border p-3" key={month.period}>
                <p className="text-xs text-muted-foreground">
                  {monthName(month.month, "short")}
                </p>
                <p className="mt-2 text-sm font-medium tabular-nums">
                  {money(month.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {month.count} {month.count === 1 ? "entry" : "entries"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Savings details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((deposit) => {
                    const goal = goals.find(
                      (entry) => entry.id === deposit.goalId,
                    );
                    return (
                      <TableRow key={deposit.id}>
                        <TableCell>{deposit.depositDate}</TableCell>
                        <TableCell className="font-medium">
                          {goal?.name ?? "Archived goal"}
                        </TableCell>
                        <TableCell>{goal?.destination ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(deposit.amount)}
                        </TableCell>
                        <TableCell>{deposit.referenceNumber ?? "—"}</TableCell>
                        <TableCell className="max-w-72 whitespace-normal break-words text-muted-foreground">
                          {deposit.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No savings match this year and goal filter.
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
