"use client";

import { useState } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  categories,
  categoryBudgetSummaries,
  money,
  total,
  type CategoryBudget,
} from "@/lib/budget";
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

function toCents(value: FormDataEntryValue | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function statusLabel(status: "saved" | "on-budget" | "overspent") {
  if (status === "saved") return "Saved";
  if (status === "overspent") return "Overspent";
  return "On budget";
}

function BudgetPlanEditor({
  month,
  monthlyBudget,
  allocations,
}: {
  month: string;
  monthlyBudget: number;
  allocations: CategoryBudget;
}) {
  const { data, save, error, saving } = useBudget();
  const [status, setStatus] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Budget plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus("");
            const formData = new FormData(event.currentTarget);
            const budget = toCents(formData.get("monthly-budget"));
            if (budget === null) {
              setStatus("Enter a valid monthly budget.");
              return;
            }

            const nextAllocations: CategoryBudget = {};
            for (const category of categories) {
              const amount = toCents(formData.get(`category-${category}`));
              if (amount === null) {
                setStatus(`Enter a valid amount for ${category}.`);
                return;
              }
              if (amount > 0) nextAllocations[category] = amount;
            }

            const saved = await save({
              ...data,
              budgets: { ...data.budgets, [month]: budget },
              categoryBudgets: {
                ...(data.categoryBudgets ?? {}),
                [month]: nextAllocations,
              },
            });
            if (saved) setStatus("Budget plan saved.");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="monthly-budget">Monthly budget (AED)</Label>
            <Input
              id="monthly-budget"
              name="monthly-budget"
              type="number"
              min="0"
              max="99999999"
              step="0.01"
              defaultValue={monthlyBudget / 100}
              required
            />
            <p className="text-xs text-muted-foreground">
              Category allocations can be lower than the monthly total if you
              want to keep part of the budget unallocated.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <div className="space-y-2" key={category}>
                <Label htmlFor={`category-${category}`}>{category}</Label>
                <Input
                  id={`category-${category}`}
                  name={`category-${category}`}
                  type="number"
                  min="0"
                  max="99999999"
                  step="0.01"
                  defaultValue={(allocations[category] ?? 0) / 100}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!!error || saving}>Save budget plan</Button>
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BudgetVsActual() {
  const { data } = useBudget();
  const [month, setMonth] = useState(
    new Date().toLocaleDateString("en-CA").slice(0, 7),
  );

  const monthlyBudget = data.budgets[month] ?? 0;
  const allocations = data.categoryBudgets?.[month] ?? {};
  const summaries = categoryBudgetSummaries(data, month);
  const expenses = data.expenses.filter((expense) =>
    expense.date.startsWith(month),
  );
  const actual = total(expenses);
  const allocated = summaries.reduce((sum, entry) => sum + entry.budget, 0);
  const variance = monthlyBudget - actual;
  const allocationVariance = monthlyBudget - allocated;
  const usedPercent =
    monthlyBudget > 0 ? Math.round((actual / monthlyBudget) * 100) : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Budget vs. actual
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set your monthly plan by category and compare it with recorded
            expenses.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget-month">Month</Label>
          <Input
            id="budget-month"
            className="w-auto"
            type="month"
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(monthlyBudget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actual spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">{money(actual)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {expenses.length} expenses
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
              className={`text-2xl font-medium tabular-nums ${
                variance < 0 ? "text-destructive" : ""
              }`}
            >
              {variance < 0 ? "-" : ""}
              {money(Math.abs(variance))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!monthlyBudget
                ? "Set a budget to measure variance"
                : variance < 0
                  ? "Overspent"
                  : variance > 0
                    ? "Remaining"
                    : "On budget"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Category allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(allocated)}
            </p>
            <p
              className={`mt-1 text-xs ${
                allocationVariance < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {!monthlyBudget
                ? "No monthly budget set"
                : allocationVariance < 0
                  ? `${money(Math.abs(allocationVariance))} over-allocated`
                  : `${money(allocationVariance)} unallocated`}
            </p>
          </CardContent>
        </Card>
      </div>

      {monthlyBudget > 0 && (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="Monthly budget used"
            aria-valuenow={Math.min(100, usedPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={
                actual > monthlyBudget
                  ? "h-full bg-destructive"
                  : "h-full bg-primary"
              }
              style={{ width: Math.min(100, usedPercent) + "%" }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {usedPercent}% of the monthly budget used
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <BudgetPlanEditor
          key={month + JSON.stringify(allocations) + monthlyBudget}
          month={month}
          monthlyBudget={monthlyBudget}
          allocations={allocations}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Category comparison
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
                  {summaries.map((entry) => {
                    const percent =
                      entry.budget > 0
                        ? Math.round((entry.actual / entry.budget) * 100)
                        : entry.actual > 0
                          ? 100
                          : 0;
                    return (
                      <TableRow key={entry.category}>
                        <TableCell className="min-w-44">
                          <div className="font-medium">{entry.category}</div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={
                                entry.status === "overspent"
                                  ? "h-full bg-destructive"
                                  : "h-full bg-primary/70"
                              }
                              style={{ width: Math.min(100, percent) + "%" }}
                            />
                          </div>
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
                            {statusLabel(entry.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
