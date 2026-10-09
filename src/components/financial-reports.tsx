"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Landmark, WalletCards } from "lucide-react";
import { useBudget } from "@/components/budget-provider";
import { money } from "@/lib/budget";
import { phpMoney } from "@/lib/government";
import {
  financialReportYears,
  monthlyFinancialReport,
  monthlyFinancialReportCsv,
  yearlyFinancialReport,
  yearlyFinancialReportCsv,
} from "@/lib/reports";
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

function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, number - 1, 1)));
}

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FinancialReports() {
  const { data } = useBudget();
  const today = new Date().toLocaleDateString("en-CA");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const years = useMemo(
    () => financialReportYears(data, Number(today.slice(0, 4))),
    [data, today],
  );
  const monthly = useMemo(
    () => monthlyFinancialReport(data, month, today),
    [data, month, today],
  );
  const yearly = useMemo(
    () => yearlyFinancialReport(data, year, today),
    [data, year, today],
  );
  const activeCategories = monthly.budget.categorySummaries.filter(
    (entry) => entry.budget > 0 || entry.actual > 0,
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Financial reports</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Monthly and yearly performance
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review budget performance, savings, obligations, remittances, and
            Philippine financial activity. AED and PHP remain separate in every
            report and export.
          </p>
          <Link
            href="/reports/history"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Open budget history analysis
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="report-month">Month</Label>
            <Input
              id="report-month"
              className="w-auto"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) {
                  setMonth(event.target.value);
                  setYear(Number(event.target.value.slice(0, 4)));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-year">Year</Label>
            <select
              id="report-year"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              `financial-report-${month}.csv`,
              monthlyFinancialReportCsv(data, month, today),
            )
          }
        >
          <Download className="size-4" />
          Export monthly CSV
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              `financial-report-${year}.csv`,
              yearlyFinancialReportCsv(data, year, today),
            )
          }
        >
          <Download className="size-4" />
          Export yearly CSV
        </Button>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Monthly report</p>
            <h2 className="mt-2 text-xl font-medium">
              {monthLabel(month)}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Snapshot through {monthly.financial.asOfDate}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                {money(monthly.budget.budget)}
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
                {money(monthly.budget.actual)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={
                  monthly.budget.variance < 0
                    ? "text-2xl font-medium tabular-nums text-destructive"
                    : "text-2xl font-medium tabular-nums"
                }
              >
                {monthly.budget.variance < 0 ? "-" : ""}
                {money(Math.abs(monthly.budget.variance))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {monthly.budget.variance < 0
                  ? "Overspent"
                  : monthly.budget.variance > 0
                    ? "Saved against budget"
                    : "On budget"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Savings added
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                {money(monthly.aed.savingsAdded)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Goal contributions, not expenses
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <WalletCards className="size-4" />
                AED activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Bills paid", money(monthly.aed.billsPaid)],
                ["Debt repaid", money(monthly.aed.debtRepaid)],
                ["Remitted", money(monthly.aed.remitted)],
                ["Remittance fees", money(monthly.aed.remittanceFees)],
                ["Family / support remittance", money(monthly.aed.remittanceSupport)],
                ["Own-account transfers", money(monthly.aed.ownAccountTransfers)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Landmark className="size-4" />
                PHP activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Government contributions paid", phpMoney(monthly.php.governmentPaid)],
                ["MP2 saved", phpMoney(monthly.php.mp2Saved)],
                ["Remittance received", phpMoney(monthly.php.remittanceReceived)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
              <p className="text-xs leading-5 text-muted-foreground">
                PHP amounts are reported in their original currency and are not
                converted into AED.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Category budget performance
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
                          className={
                            entry.variance < 0
                              ? "text-right font-medium tabular-nums text-destructive"
                              : "text-right font-medium tabular-nums"
                          }
                        >
                          {entry.variance < 0 ? "-" : ""}
                          {money(Math.abs(entry.variance))}
                        </TableCell>
                        <TableCell>
                          {entry.status === "saved"
                            ? "Saved"
                            : entry.status === "overspent"
                              ? "Overspent"
                              : "On budget"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No budget or spending activity for this month.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 border-t pt-8">
        <div>
          <p className="eyebrow">Yearly report</p>
          <h2 className="mt-2 text-xl font-medium">{year} summary</h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Annual budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                {money(yearly.aed.budget)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Annual spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                {money(yearly.aed.spent)}
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
                className={
                  yearly.aed.variance < 0
                    ? "text-2xl font-medium tabular-nums text-destructive"
                    : "text-2xl font-medium tabular-nums"
                }
              >
                {yearly.aed.variance < 0 ? "-" : ""}
                {money(Math.abs(yearly.aed.variance))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Savings added
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-medium tabular-nums">
                {money(yearly.aed.savingsAdded)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Yearly AED flows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Bills paid", money(yearly.aed.billsPaid)],
                ["Debt repaid", money(yearly.aed.debtRepaid)],
                ["Remitted", money(yearly.aed.remitted)],
                ["Remittance fees", money(yearly.aed.remittanceFees)],
                ["Support remitted", money(yearly.aed.supportRemitted)],
                ["Own-account transfers", money(yearly.aed.ownAccountTransfers)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Yearly PHP flows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Government contributions", phpMoney(yearly.php.governmentPaid)],
                ["MP2 saved", phpMoney(yearly.php.mp2Saved)],
                ["Remittance received", phpMoney(yearly.php.remittanceReceived)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
              <div className="border-t pt-3">
                {yearly.php.governmentByProvider.map((entry) => (
                  <div
                    key={entry.provider}
                    className="flex justify-between gap-4 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {entry.provider === "PHILHEALTH"
                        ? "PhilHealth"
                        : entry.provider === "PAGIBIG"
                          ? "Pag-IBIG"
                          : "SSS"}
                    </span>
                    <span className="tabular-nums">
                      {entry.configured ? phpMoney(entry.amount) : "Not configured"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Monthly financial history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Budget AED</TableHead>
                    <TableHead className="text-right">Spent AED</TableHead>
                    <TableHead className="text-right">Variance AED</TableHead>
                    <TableHead className="text-right">Remitted AED</TableHead>
                    <TableHead className="text-right">PHP received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearly.monthly.length ? (
                    yearly.monthly.toReversed().map((entry) => (
                      <TableRow key={entry.month}>
                        <TableCell className="font-medium">
                          {monthLabel(entry.month)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.budget.budget)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.budget.actual)}
                        </TableCell>
                        <TableCell
                          className={
                            entry.budget.variance < 0
                              ? "text-right tabular-nums text-destructive"
                              : "text-right tabular-nums"
                          }
                        >
                          {entry.budget.variance < 0 ? "-" : ""}
                          {money(Math.abs(entry.budget.variance))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.aed.remitted)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {phpMoney(entry.php.remittanceReceived)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No reportable months for this year.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
