"use client";

import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import { money, monthlyBudgetReport } from "@/lib/budget";
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

function monthLabel(month: string) {
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

export function MonthlyBudgetReportView() {
  const { data } = useBudget();
  const [month, setMonth] = useState(
    new Date().toLocaleDateString("en-CA").slice(0, 7),
  );
  const report = useMemo(() => monthlyBudgetReport(data, month), [data, month]);
  const activeCategories = report.categorySummaries.filter(
    (entry) => entry.budget > 0 || entry.actual > 0,
  );
  const overspentCategories = report.categorySummaries
    .filter((entry) => entry.status === "overspent")
    .toSorted((a, b) => a.variance - b.variance);
  const savedCategories = report.categorySummaries
    .filter((entry) => entry.status === "saved")
    .toSorted((a, b) => b.variance - a.variance);
  const topOverspent = overspentCategories[0];
  const topSaved = savedCategories[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Monthly report</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {monthLabel(month)} budget performance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your plan, actual spending, savings, and overspending for the
            selected month.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-month">Month</Label>
          <Input
            id="report-month"
            className="w-auto"
            type="month"
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(report.budget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actual spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(report.actual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-medium tabular-nums ${
                report.overspent > 0 ? "text-destructive" : ""
              }`}
            >
              {report.overspent > 0 ? "-" : ""}
              {money(report.overspent || report.saved)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!report.budget
                ? "No monthly budget set"
                : report.overspent > 0
                  ? "Over monthly budget"
                  : report.saved > 0
                    ? "Saved against monthly budget"
                    : "Exactly on budget"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {percent(report.savingsRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Monthly budget left unspent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Category savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(report.categorySaved)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total under-budget amount across categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Category overspending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-medium tabular-nums ${
                report.categoryOverspent > 0 ? "text-destructive" : ""
              }`}
            >
              {money(report.categoryOverspent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total above category plans
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Monthly position</CardTitle>
        </CardHeader>
        <CardContent>
          {report.budget > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {money(report.actual)} spent of {money(report.budget)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {percent(report.budgetUsedRate)} used
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Monthly budget used"
                aria-valuenow={Math.min(100, Math.round(report.budgetUsedRate))}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={
                    report.overspent > 0
                      ? "h-full bg-destructive"
                      : "h-full bg-primary"
                  }
                  style={{
                    width: Math.min(100, report.budgetUsedRate) + "%",
                  }}
                />
              </div>
              <div className="mt-5 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Allocated</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(report.allocated)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {report.unallocated < 0 ? "Over-allocated" : "Unallocated"}
                  </p>
                  <p
                    className={`mt-1 font-medium tabular-nums ${
                      report.unallocated < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {money(Math.abs(report.unallocated))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active categories</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {activeCategories.length}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set a monthly budget to calculate your savings rate and overall
              budget position.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Biggest variance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Most overspent</p>
              <p className="mt-2 font-medium">
                {topOverspent?.category ?? "None"}
              </p>
              <p
                className={`mt-1 text-sm tabular-nums ${
                  topOverspent ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {topOverspent
                  ? `-${money(Math.abs(topOverspent.variance))}`
                  : "No overspending"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Most under budget</p>
              <p className="mt-2 font-medium">{topSaved?.category ?? "None"}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {topSaved ? money(topSaved.variance) : "No category savings"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Report interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Net result compares total monthly spending with the overall
              monthly budget.
            </p>
            <p>
              Category savings and category overspending are shown separately,
              so overspending in one area is not hidden by savings in another.
            </p>
            <p>
              Savings rate is the percentage of the monthly budget that remains
              unspent. It is zero when the month is over budget.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Category performance
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
                  <TableHead>Status</TableHead>
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
                      <TableCell>
                        <span
                          className={`whitespace-nowrap rounded-md px-2 py-1 text-xs ${
                            entry.status === "overspent"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.status === "saved"
                            ? "Saved"
                            : entry.status === "overspent"
                              ? "Overspent"
                              : "On budget"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No category budget or spending activity for this month.
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
