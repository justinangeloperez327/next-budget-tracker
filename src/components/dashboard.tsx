"use client";
import Link from "next/link";
import { NotebookNote } from "@/components/sakura-companion";
import {
  CalendarDays,
  HandCoins,
  PiggyBank,
  Send,
  Wallet,
  Receipt,
  Target,
} from "lucide-react";
import { SpotlightCard } from "@/components/kokonutui/spotlight-cards";
import { useState } from "react";
import { useBudget } from "@/components/budget-provider";
import { categories, money, total } from "@/lib/budget";
import { billOccurrencesForPeriod } from "@/lib/bills";
import { debtDashboardSnapshot } from "@/lib/debt";
import { savingsDashboardSnapshot } from "@/lib/savings";
import { remittanceMonthSummary } from "@/lib/remittance";
import { ExpenseEditor } from "@/components/expense-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
export function Dashboard() {
  const { data, save, error, saving } = useBudget();
  const [month, setMonth] = useState(
    new Date().toLocaleDateString("en-CA").slice(0, 7),
  );
  const expenses = data.expenses.filter((e) => e.date.startsWith(month));
  const today = new Date().toLocaleDateString("en-CA");
  const billOccurrences = billOccurrencesForPeriod(
    data.recurringBills ?? [],
    data.billPayments ?? [],
    month,
    today,
  );
  const billsOutstanding = billOccurrences
    .filter((entry) => !entry.payment)
    .reduce((sum, entry) => sum + entry.bill.amount, 0);
  const overdueBills = billOccurrences.filter(
    (entry) => entry.status === "Overdue",
  ).length;
  const debtSummary = debtDashboardSnapshot(
    data.debts ?? [],
    data.debtPayments ?? [],
    today,
  );
  const savingsSummary = savingsDashboardSnapshot(
    data.savingsGoals ?? [],
    data.savingsDeposits ?? [],
    today,
  );
  const remittanceSummary = remittanceMonthSummary(
    data.remittances ?? [],
    month,
  );
  const spent = total(expenses),
    budget = data.budgets[month] || 0;
  const [status, setStatus] = useState("");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Your monthly notebook
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A clear view of your monthly spending.
          </p>
        </div>
        <ExpenseEditor />
      </div>
      <div className="my-6 flex items-center gap-3">
        <Label htmlFor="month">Month</Label>
        <Input
          className="w-auto"
          type="month"
          id="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: budget && spent > budget ? "Over budget" : "Remaining",
            value: budget ? money(Math.abs(budget - spent)) : "Set a budget",
            icon: Target,
            color:
              budget && spent > budget
                ? "var(--destructive)"
                : "var(--primary)",
            description: budget
              ? spent > budget
                ? "Review your monthly plan"
                : "Available within your plan"
              : "Create your monthly plan below",
          },
          {
            label: "Monthly budget",
            value: money(budget),
            icon: Wallet,
            color: "var(--primary)",
            description: "Your plan for the month",
          },
          {
            label: "Total spent",
            value: money(spent),
            icon: Receipt,
            color: "var(--muted-foreground)",
            description: `${expenses.length} expenses recorded`,
          },
          {
            label: "Bills outstanding",
            value: money(billsOutstanding),
            icon: CalendarDays,
            color: overdueBills ? "var(--destructive)" : "var(--primary)",
            description: overdueBills
              ? `${overdueBills} overdue bill${overdueBills === 1 ? "" : "s"}`
              : `${billOccurrences.filter((entry) => !entry.payment).length} still due`,
          },
          {
            label: "Debt remaining",
            value: money(debtSummary.remaining),
            icon: HandCoins,
            color: debtSummary.overdueCount
              ? "var(--destructive)"
              : "var(--primary)",
            description: debtSummary.overdueCount
              ? `${debtSummary.overdueCount} overdue debt${debtSummary.overdueCount === 1 ? "" : "s"}`
              : `${debtSummary.activeCount} active debt${debtSummary.activeCount === 1 ? "" : "s"}`,
          },
          {
            label: "Savings goals",
            value: money(savingsSummary.totalSaved),
            icon: PiggyBank,
            color: savingsSummary.pastDueCount
              ? "var(--destructive)"
              : "var(--primary)",
            description: savingsSummary.pastDueCount
              ? `${savingsSummary.pastDueCount} goal${savingsSummary.pastDueCount === 1 ? "" : "s"} past target date`
              : `${savingsSummary.activeCount} active · ${savingsSummary.completedCount} completed`,
          },
          {
            label: "Remitted this month",
            value: money(remittanceSummary.sentAmount),
            icon: Send,
            color: remittanceSummary.pendingCount
              ? "var(--muted-foreground)"
              : "var(--primary)",
            description: remittanceSummary.pendingCount
              ? `${remittanceSummary.pendingCount} transfer${remittanceSummary.pendingCount === 1 ? "" : "s"} pending · ${money(remittanceSummary.feeAmount)} fees`
              : `${remittanceSummary.count} transfer${remittanceSummary.count === 1 ? "" : "s"} · ${money(remittanceSummary.feeAmount)} fees`,
          },
        ].map(({ label, value, icon, color, description }, index) => (
          <SpotlightCard
            key={label}
            className={
              index === 0 ? "notebook-note md:col-span-2 xl:col-span-1" : undefined
            }
            item={{ title: label, description, icon, color }}
          >
            <p
              className={`break-words font-medium tabular-nums tracking-tight ${index === 0 ? "text-3xl" : "text-2xl"}`}
            >
              {value}
            </p>
          </SpotlightCard>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Monthly plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={month + budget}
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const cents = Math.round(
                  Number(new FormData(e.currentTarget).get("budget")) * 100,
                );
                if (
                  Number.isSafeInteger(cents) &&
                  cents >= 0 &&
                  (await save({
                    ...data,
                    budgets: { ...data.budgets, [month]: cents },
                  }))
                )
                  setStatus("Monthly budget saved.");
              }}
            >
              <Label htmlFor="budget">Budget (AED)</Label>
              <div className="flex gap-2">
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  required
                  min="0"
                  max="99999999"
                  step="0.01"
                  defaultValue={budget / 100}
                />
                <Button disabled={!!error || saving}>Save</Button>
              </div>
              <p role="status" className="text-sm text-muted-foreground">
                {status}
              </p>
            </form>
            {budget > 0 && (
              <div className="mt-5">
                <div
                  role="progressbar"
                  aria-label="Monthly budget used"
                  aria-valuenow={Math.min(
                    100,
                    Math.round((spent / budget) * 100),
                  )}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: Math.min(100, (spent / budget) * 100) + "%",
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {Math.round((spent / budget) * 100)}% of budget used
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Spending by category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {spent === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expenses this month. Add your first expense to see the
                breakdown.
              </p>
            ) : (
              categories.map((c) => {
                const value = total(expenses.filter((e) => e.category === c));
                return value > 0 ? (
                  <div key={c}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>{c}</span>
                      <span>{money(value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: (value / spent) * 100 + "%" }}
                      />
                    </div>
                  </div>
                ) : null;
              })
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium">Recent expenses</h2>
        <Link className="text-sm underline underline-offset-4" href="/expenses">
          View all
        </Link>
      </div>
      <div className="mt-4 divide-y rounded-xl border bg-card">
        {expenses.length === 0 ? (
          <NotebookNote
            title="A fresh page for your expenses"
            className="border-0"
          >
            Add your first expense using the button above. Your recent entries
            will appear here.
          </NotebookNote>
        ) : (
          expenses
            .toSorted((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((e) => (
              <div
                className="flex justify-between gap-4 p-4 text-sm"
                key={e.id}
              >
                <div>
                  <p>{e.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.category} · {e.date}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                  {money(e.amount)}
                </span>
              </div>
            ))
        )}
      </div>
    </>
  );
}
