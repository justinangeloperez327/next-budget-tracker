"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Landmark,
  PiggyBank,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useBudget } from "@/components/budget-provider";
import { money } from "@/lib/budget";
import {
  financialDashboardSnapshot,
} from "@/lib/financial-dashboard";
import { phpMoney } from "@/lib/government";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-medium tabular-nums">{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function FilipinoFinancialDashboard() {
  const { data } = useBudget();
  const today = new Date().toLocaleDateString("en-CA");
  const [month, setMonth] = useState(today.slice(0, 7));
  const snapshot = financialDashboardSnapshot(data, month, today);
  const budgetStatus =
    snapshot.aed.budget === 0
      ? "No monthly budget set"
      : snapshot.aed.variance >= 0
        ? `${money(snapshot.aed.variance)} remaining`
        : `${money(Math.abs(snapshot.aed.variance))} over budget`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">UAE + Philippines</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Filipino financial dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            One view for household spending in AED and Philippine obligations,
            savings, and remittances in PHP. Currency totals stay separate so
            the dashboard never creates a misleading mixed-currency balance.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="financial-month">Month</Label>
          <Input
            id="financial-month"
            className="w-auto"
            type="month"
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Monthly budget"
          value={money(snapshot.aed.budget)}
          detail={budgetStatus}
        />
        <Metric
          label="Spent in AED"
          value={money(snapshot.aed.spent)}
          detail={
            snapshot.aed.budget
              ? `${Math.round((snapshot.aed.spent / snapshot.aed.budget) * 100)}% of monthly budget`
              : "Budget vs. actual uses AED expenses only"
          }
        />
        <Metric
          label="Savings progress"
          value={money(snapshot.aed.savingsSaved)}
          detail={`${money(snapshot.aed.savingsRemaining)} remaining across goals`}
        />
        <Metric
          label="Debt remaining"
          value={money(snapshot.aed.debtRemaining)}
          detail={
            snapshot.aed.overdueDebts
              ? `${snapshot.aed.overdueDebts} overdue debt${snapshot.aed.overdueDebts === 1 ? "" : "s"}`
              : "No overdue debt recorded"
          }
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <WalletCards className="size-4" />
              UAE / AED position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Bills still due", money(snapshot.aed.billsOutstanding)],
              ["Remitted this month", money(snapshot.aed.remitted)],
              ["Remittance fees", money(snapshot.aed.remittanceFees)],
              ["Family / support remittance", money(snapshot.aed.remittanceSupport)],
              ["Own-account transfers", money(snapshot.aed.ownAccountTransfers)],
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
              Own-account remittance principal is shown as money movement, not
              spending. Its transfer fee still counts as an expense.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Landmark className="size-4" />
              Philippines / PHP position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Government contributions YTD", phpMoney(snapshot.php.governmentYtdPaid)],
              ["MP2 saved", phpMoney(snapshot.php.mp2TotalSaved)],
              ["MP2 saved YTD", phpMoney(snapshot.php.mp2YtdSaved)],
              ["PHP received this month", phpMoney(snapshot.php.remittanceReceived)],
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
              PHP values are not converted into AED. The dashboard preserves
              the original currency of Philippine contributions and MP2.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <ShieldCheck className="size-4" />
              Philippine contribution status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.contributions.map((entry) => (
              <Link
                href={entry.href}
                key={entry.provider}
                className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.configured
                      ? `${entry.paidExpectedPeriods}/${entry.expectedDuePeriods} expected periods paid`
                      : "Profile not configured"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {phpMoney(entry.ytdPaid)}
                  </p>
                  <p
                    className={
                      entry.attentionCount
                        ? "mt-1 text-xs text-destructive"
                        : "mt-1 text-xs text-muted-foreground"
                    }
                  >
                    {entry.attentionCount
                      ? `${entry.attentionCount} need attention`
                      : entry.configured
                        ? "Up to date"
                        : "Set up"}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <PiggyBank className="size-4" />
              MP2 snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Accounts</span>
              <span className="font-medium">{snapshot.mp2.accountCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium">{snapshot.mp2.activeCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Saved this month</span>
              <span className="font-medium tabular-nums">
                {phpMoney(snapshot.mp2.currentMonthSaved)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Matured accounts</span>
              <span className="font-medium">{snapshot.mp2.maturedCount}</span>
            </div>
            <Link
              href="/mp2"
              className="inline-block text-sm underline underline-offset-4"
            >
              Open MP2 tracker
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <AlertTriangle className="size-4" />
            Needs attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.attention.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.attention.map((item) => (
                <Link
                  href={item.href}
                  key={item.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    {item.severity === "attention" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    ) : (
                      <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              No overdue or pending financial items found for this snapshot.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
