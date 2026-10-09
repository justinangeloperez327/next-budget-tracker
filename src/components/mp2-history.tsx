"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import { mp2HistoryYears, mp2MonthlyHistory } from "@/lib/mp2";
import { phpMoney } from "@/lib/government";
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
  return new Intl.DateTimeFormat("en-PH", {
    month: format,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

export function Mp2History() {
  const { data } = useBudget();
  const accounts = data.mp2Accounts ?? [];
  const deposits = useMemo(
    () =>
      (data.mp2Deposits ?? []).toSorted(
        (a, b) =>
          b.paymentDate.localeCompare(a.paymentDate) ||
          b.id.localeCompare(a.id),
      ),
    [data.mp2Deposits],
  );
  const years = useMemo(() => mp2HistoryYears(deposits), [deposits]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [accountId, setAccountId] = useState("all");
  const filtered = deposits.filter(
    (deposit) =>
      deposit.paymentDate.startsWith(String(year)) &&
      (accountId === "all" || deposit.accountId === accountId),
  );
  const months = mp2MonthlyHistory(
    deposits,
    year,
    accountId === "all" ? undefined : accountId,
  );
  const total = filtered.reduce((sum, deposit) => sum + deposit.amount, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">MP2 Savings history</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {year} savings record
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review MP2 savings by account, month, payment date, reference
            number, and notes.
          </p>
          <Link
            href="/mp2"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Back to MP2 tracker
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="mp2-history-year">Year</Label>
            <select
              id="mp2-history-year"
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
            <Label htmlFor="mp2-history-account">Account</Label>
            <select
              id="mp2-history-account"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
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
              {phpMoney(total)}
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
                  {phpMoney(month.amount)}
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
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{deposit.paymentDate}</TableCell>
                      <TableCell className="font-medium">
                        {accounts.find((account) => account.id === deposit.accountId)
                          ?.name ?? "Unknown account"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {phpMoney(deposit.amount)}
                      </TableCell>
                      <TableCell>{deposit.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal break-words text-muted-foreground">
                        {deposit.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No MP2 savings match this year and account filter.
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
