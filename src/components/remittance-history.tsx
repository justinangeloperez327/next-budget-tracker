"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBudget } from "@/components/budget-provider";
import { money } from "@/lib/budget";
import {
  phpMoney,
  remittanceEffectiveRate,
  remittanceHistoryYears,
  remittanceMonthlyHistory,
} from "@/lib/remittance";
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

function monthName(month: number) {
  return new Intl.DateTimeFormat("en-AE", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

export function RemittanceHistory() {
  const { data } = useBudget();
  const remittances = useMemo(
    () =>
      (data.remittances ?? []).toSorted(
        (a, b) =>
          b.transferDate.localeCompare(a.transferDate) ||
          b.id.localeCompare(a.id),
      ),
    [data.remittances],
  );
  const years = useMemo(
    () => remittanceHistoryYears(remittances),
    [remittances],
  );
  const [year, setYear] = useState(() => new Date().getFullYear());
  const entries = remittances.filter((entry) =>
    entry.transferDate.startsWith(String(year)),
  );
  const months = remittanceMonthlyHistory(remittances, year);
  const totalSent = entries.reduce((sum, entry) => sum + entry.sentAmount, 0);
  const totalFees = entries.reduce((sum, entry) => sum + entry.feeAmount, 0);
  const totalReceived = entries.reduce(
    (sum, entry) => sum + (entry.receivedAmount ?? 0),
    0,
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Remittance history</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            {year} transfer record
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review the AED sent, fees paid, and PHP received over time.
          </p>
          <Link
            href="/remittances"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Back to remittance tracker
          </Link>
        </div>
        <div className="space-y-2">
          <Label htmlFor="remittance-history-year">Year</Label>
          <select
            id="remittance-history-year"
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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AED sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(totalSent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fees paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(totalFees)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PHP received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(totalReceived)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Monthly overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {months.map((month) => (
              <div className="rounded-lg border p-3" key={month.period}>
                <p className="text-xs text-muted-foreground">
                  {monthName(month.month)}
                </p>
                <p className="mt-2 text-sm font-medium tabular-nums">
                  {money(month.sentAmount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {month.count} transfer{month.count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Transfer details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">AED sent</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">PHP received</TableHead>
                  <TableHead className="text-right">Effective rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length ? (
                  entries.map((entry) => {
                    const rate = remittanceEffectiveRate(entry);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.transferDate}</TableCell>
                        <TableCell className="font-medium">
                          {entry.recipient}
                        </TableCell>
                        <TableCell>{entry.destinationType}</TableCell>
                        <TableCell>{entry.provider ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.sentAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.feeAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {entry.receivedAmount
                            ? phpMoney(entry.receivedAmount)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rate ? `₱${rate.toFixed(2)} / AED` : "—"}
                        </TableCell>
                        <TableCell>{entry.status}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No remittances recorded for this year.
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
