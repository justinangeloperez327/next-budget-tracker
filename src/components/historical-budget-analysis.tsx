"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBudget } from "@/components/budget-provider";
import {
  budgetHistoryMonths,
  historicalBudgetAnalysis,
  money,
} from "@/lib/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

function shortMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AE", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function fullMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function HistoricalBudgetAnalysisView() {
  const { data } = useBudget();
  const [range, setRange] = useState("6");
  const allMonths = useMemo(() => budgetHistoryMonths(data), [data]);
  const selectedMonths =
    range === "all" ? allMonths : allMonths.slice(-Number(range));
  const analysis = useMemo(
    () => historicalBudgetAnalysis(data, selectedMonths),
    [data, selectedMonths],
  );
  const maxMonthlyValue = Math.max(
    1,
    ...analysis.reports.flatMap((report) => [report.budget, report.actual]),
  );
  const activeCategories = analysis.categoryPerformance
    .filter((entry) => entry.activeMonths > 0)
    .toSorted((a, b) => b.actual - a.actual);
  const mostOverspent = activeCategories
    .filter((entry) => entry.variance < 0)
    .toSorted((a, b) => a.variance - b.variance)[0];
  const mostSaved = activeCategories
    .filter((entry) => entry.variance > 0)
    .toSorted((a, b) => b.variance - a.variance)[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Historical analysis</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Budget performance over time
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare monthly budgets, spending, savings rates, and category
            performance across your recorded history.
          </p>
          <Link
            href="/reports"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Back to reports
          </Link>
        </div>
        <div className="space-y-2">
          <Label htmlFor="history-range">Period</Label>
          <select
            id="history-range"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
            <option value="all">All history</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Months tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {analysis.reports.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(analysis.totalBudget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(analysis.totalActual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-medium tabular-nums ${
                analysis.netVariance < 0 ? "text-destructive" : ""
              }`}
            >
              {analysis.netVariance < 0 ? "-" : ""}
              {money(Math.abs(analysis.netVariance))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average savings rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {percent(analysis.averageSavingsRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                {analysis.savedMonths}
              </span>{" "}
              saved ·{" "}
              <span
                className={
                  analysis.overspentMonths > 0
                    ? "font-medium tabular-nums text-destructive"
                    : "font-medium tabular-nums"
                }
              >
                {analysis.overspentMonths}
              </span>{" "}
              overspent ·{" "}
              <span className="font-medium tabular-nums">
                {analysis.onBudgetMonths}
              </span>{" "}
              on budget
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Budget vs. actual trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.reports.length ? (
            <>
              <div className="flex min-h-52 items-end gap-3 overflow-x-auto border-b pb-3">
                {analysis.reports.map((report) => {
                  const budgetHeight = Math.max(
                    report.budget > 0 ? 4 : 0,
                    (report.budget / maxMonthlyValue) * 160,
                  );
                  const actualHeight = Math.max(
                    report.actual > 0 ? 4 : 0,
                    (report.actual / maxMonthlyValue) * 160,
                  );
                  return (
                    <div
                      className="flex min-w-16 flex-1 flex-col items-center gap-2"
                      key={report.month}
                    >
                      <div className="flex h-40 items-end gap-1.5">
                        <div
                          title={`Budget: ${money(report.budget)}`}
                          className="w-4 rounded-t bg-primary/35"
                          style={{ height: budgetHeight }}
                        />
                        <div
                          title={`Actual: ${money(report.actual)}`}
                          className={
                            report.actual > report.budget && report.budget > 0
                              ? "w-4 rounded-t bg-destructive"
                              : "w-4 rounded-t bg-primary"
                          }
                          style={{ height: actualHeight }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {shortMonth(report.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-primary/35" />
                  Budget
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-primary" />
                  Actual
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-destructive" />
                  Actual over budget
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add budgets or expenses to build your historical trend.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Period highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">
                Most overspent category
              </p>
              <p className="mt-2 font-medium">
                {mostOverspent?.category ?? "None"}
              </p>
              <p
                className={`mt-1 text-sm tabular-nums ${
                  mostOverspent ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {mostOverspent
                  ? `-${money(Math.abs(mostOverspent.variance))}`
                  : "No category is over budget"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">
                Most under-budget category
              </p>
              <p className="mt-2 font-medium">{mostSaved?.category ?? "None"}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {mostSaved
                  ? money(mostSaved.variance)
                  : "No category savings recorded"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Savings and overspending
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Gross monthly savings
              </p>
              <p className="mt-1 text-xl font-medium tabular-nums">
                {money(analysis.totalSaved)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Gross monthly overspending
              </p>
              <p
                className={`mt-1 text-xl font-medium tabular-nums ${
                  analysis.totalOverspent > 0 ? "text-destructive" : ""
                }`}
              >
                {money(analysis.totalOverspent)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Monthly history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Savings rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.reports.length ? (
                  analysis.reports.toReversed().map((report) => (
                    <TableRow key={report.month}>
                      <TableCell className="font-medium">
                        {fullMonth(report.month)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(report.budget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(report.actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          report.variance < 0 ? "text-destructive" : ""
                        }`}
                      >
                        {report.variance < 0 ? "-" : ""}
                        {money(Math.abs(report.variance))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.budget > 0 ? percent(report.savingsRate) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No budget history yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Category trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Overspent months</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCategories.length ? (
                  activeCategories.map((entry) => (
                    <TableRow key={entry.category}>
                      <TableCell className="font-medium">
                        {entry.category}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(entry.budget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(entry.actual)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          entry.variance < 0 ? "text-destructive" : ""
                        }`}
                      >
                        {entry.variance < 0 ? "-" : ""}
                        {money(Math.abs(entry.variance))}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          entry.overspentMonths > 0 ? "text-destructive" : ""
                        }`}
                      >
                        {entry.overspentMonths} / {entry.activeMonths}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No category history yet.
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
