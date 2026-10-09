"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  savingsDashboardSnapshot,
  savingsGoalSnapshot,
  type SavingsDeposit,
  type SavingsGoal,
} from "@/lib/savings";
import { money } from "@/lib/budget";
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

function toCents(value: FormDataEntryValue | null, optional = false) {
  if (optional && String(value ?? "").trim() === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function statusClass(status: string) {
  if (status === "Past due") return "text-destructive";
  if (status === "Completed") return "text-primary";
  return "text-muted-foreground";
}

export function SavingsGoalsTracker() {
  const { data, save, saving, error } = useBudget();
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
  const today = new Date().toLocaleDateString("en-CA");
  const dashboard = savingsDashboardSnapshot(goals, deposits, today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [goalStatus, setGoalStatus] = useState("");
  const [depositStatus, setDepositStatus] = useState("");
  const editingGoal = goals.find((goal) => goal.id === editingId);

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGoalStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const targetAmount = toCents(formData.get("target-amount"));
    const monthlyTarget = toCents(formData.get("monthly-target"), true);
    const name = String(formData.get("name")).trim();
    const startDate = String(formData.get("start-date"));
    const targetDate = optionalText(formData.get("target-date"));

    if (
      !name ||
      targetAmount === null ||
      targetAmount === undefined ||
      monthlyTarget === null ||
      !startDate ||
      (targetDate && targetDate < startDate)
    ) {
      setGoalStatus("Check the goal name, amount, and dates.");
      return;
    }

    const alreadySaved = editingGoal
      ? savingsGoalSnapshot(editingGoal, deposits, today).saved
      : 0;
    if (targetAmount < alreadySaved) {
      setGoalStatus(
        "Target amount cannot be lower than savings already recorded.",
      );
      return;
    }

    const goal: SavingsGoal = {
      id: editingGoal?.id ?? crypto.randomUUID(),
      name,
      targetAmount,
      startDate,
      active: formData.get("active") === "on",
      ...(targetDate ? { targetDate } : {}),
      ...(monthlyTarget === undefined ? {} : { monthlyTarget }),
      ...(optionalText(formData.get("destination"))
        ? { destination: optionalText(formData.get("destination")) }
        : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const saved = await save({
      ...data,
      savingsGoals: [...goals.filter((entry) => entry.id !== goal.id), goal],
      savingsDeposits: deposits,
    });
    if (saved) {
      form.reset();
      setEditingId(null);
      setGoalStatus("Savings goal saved.");
    }
  }

  async function recordDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepositStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const goalId = String(formData.get("goal-id"));
    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal) {
      setDepositStatus("Select a savings goal.");
      return;
    }
    if (!goal.active) {
      setDepositStatus("Activate this goal before recording savings.");
      return;
    }

    const amount = toCents(formData.get("amount"));
    const depositDate = String(formData.get("deposit-date"));
    if (amount === null || amount === undefined || !depositDate) {
      setDepositStatus("Enter a valid savings amount and date.");
      return;
    }

    const snapshot = savingsGoalSnapshot(goal, deposits, today);
    if (amount > snapshot.remaining) {
      setDepositStatus(
        `Deposit exceeds the remaining target of ${money(snapshot.remaining)}.`,
      );
      return;
    }

    const deposit: SavingsDeposit = {
      id: crypto.randomUUID(),
      goalId,
      amount,
      depositDate,
      ...(optionalText(formData.get("reference"))
        ? { referenceNumber: optionalText(formData.get("reference")) }
        : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const saved = await save({
      ...data,
      savingsGoals: goals,
      savingsDeposits: [...deposits, deposit],
    });
    if (saved) {
      form.reset();
      setDepositStatus("Savings recorded.");
    }
  }

  async function removeDeposit(deposit: SavingsDeposit) {
    await save({
      ...data,
      savingsGoals: goals,
      savingsDeposits: deposits.filter((entry) => entry.id !== deposit.id),
    });
  }

  async function removeGoal(goal: SavingsGoal) {
    if (deposits.some((deposit) => deposit.goalId === goal.id)) {
      setGoalStatus(
        "Pause goals with savings history instead of deleting them.",
      );
      return;
    }
    const saved = await save({
      ...data,
      savingsGoals: goals.filter((entry) => entry.id !== goal.id),
      savingsDeposits: deposits,
    });
    if (saved && editingId === goal.id) setEditingId(null);
  }

  return (
    <>
      <div>
        <p className="eyebrow">Savings plan</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Savings goals
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Set targets, record money saved, and track progress without counting
          savings as an expense.
        </p>
        <Link
          href="/savings/history"
          className="mt-3 inline-block text-sm underline underline-offset-4"
        >
          View savings history
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Goal targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.totalTargets)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.totalSaved)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.totalRemaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.activeCount} active goals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Goal status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                dashboard.pastDueCount
                  ? "text-2xl font-medium tabular-nums text-destructive"
                  : "text-2xl font-medium tabular-nums"
              }
            >
              {dashboard.completedCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              completed · {dashboard.pastDueCount} past due
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {dashboard.snapshots.map((snapshot) => (
          <Card key={snapshot.goal.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-medium">
                    {snapshot.goal.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {snapshot.goal.destination ?? "Destination not assigned"}
                  </p>
                </div>
                <span className={`text-sm font-medium ${statusClass(snapshot.status)}`}>
                  {snapshot.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saved</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(snapshot.saved)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(snapshot.remaining)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(snapshot.goal.targetAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target date</p>
                  <p className="mt-1 font-medium">
                    {snapshot.goal.targetDate ?? "Not set"}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Goal progress</span>
                  <span>{Math.round(snapshot.progressRate)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: Math.min(100, snapshot.progressRate) + "%" }}
                  />
                </div>
              </div>
              {snapshot.goal.monthlyTarget ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      This month · target {money(snapshot.goal.monthlyTarget)}
                    </span>
                    <span>{money(snapshot.currentMonthSaved)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width:
                          Math.min(100, snapshot.monthlyTargetProgress) + "%",
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!dashboard.snapshots.length ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Add your first savings goal to start tracking progress.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {editingGoal ? "Edit savings goal" : "Add savings goal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editingGoal?.id ?? "new"}
              className="space-y-4"
              onSubmit={saveGoal}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="saving-name">Goal name</Label>
                  <Input
                    id="saving-name"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={editingGoal?.name ?? ""}
                    placeholder="e.g. Emergency fund"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-target">Target amount (AED)</Label>
                  <Input
                    id="saving-target"
                    name="target-amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    required
                    defaultValue={
                      editingGoal ? editingGoal.targetAmount / 100 : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-start">Start date</Label>
                  <Input
                    id="saving-start"
                    name="start-date"
                    type="date"
                    required
                    defaultValue={editingGoal?.startDate ?? today}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-target-date">Target date</Label>
                  <Input
                    id="saving-target-date"
                    name="target-date"
                    type="date"
                    defaultValue={editingGoal?.targetDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-monthly">
                    Monthly savings target (AED)
                  </Label>
                  <Input
                    id="saving-monthly"
                    name="monthly-target"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    defaultValue={
                      editingGoal?.monthlyTarget
                        ? editingGoal.monthlyTarget / 100
                        : ""
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-destination">Saved in</Label>
                  <Input
                    id="saving-destination"
                    name="destination"
                    maxLength={120}
                    defaultValue={editingGoal?.destination ?? ""}
                    placeholder="e.g. UAE Savings Bank"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="saving-notes">Notes</Label>
                  <Input
                    id="saving-notes"
                    name="notes"
                    maxLength={500}
                    defaultValue={editingGoal?.notes ?? ""}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  className="size-4"
                  defaultChecked={editingGoal?.active ?? true}
                />
                Active savings goal
              </label>
              <p className="text-xs leading-5 text-muted-foreground">
                “Saved in” is only a destination label for now. It does not
                create or change a wallet balance.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={saving || !!error}>Save goal</Button>
                {editingGoal ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <p role="status" className="text-sm text-muted-foreground">
                  {goalStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Record savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={recordDeposit}>
              <div className="space-y-2">
                <Label htmlFor="saving-deposit-goal">Savings goal</Label>
                <select
                  id="saving-deposit-goal"
                  name="goal-id"
                  required
                  disabled={!goals.length}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select goal
                  </option>
                  {goals
                    .filter(
                      (goal) =>
                        goal.active &&
                        savingsGoalSnapshot(goal, deposits, today).remaining > 0,
                    )
                    .map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} · {money(savingsGoalSnapshot(goal, deposits, today).remaining)} remaining
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="saving-deposit-amount">Amount (AED)</Label>
                  <Input
                    id="saving-deposit-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    required
                    disabled={!goals.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-deposit-date">Saved date</Label>
                  <Input
                    id="saving-deposit-date"
                    name="deposit-date"
                    type="date"
                    required
                    defaultValue={today}
                    disabled={!goals.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-deposit-reference">Reference</Label>
                  <Input
                    id="saving-deposit-reference"
                    name="reference"
                    maxLength={80}
                    placeholder="Optional"
                    disabled={!goals.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saving-deposit-notes">Notes</Label>
                  <Input
                    id="saving-deposit-notes"
                    name="notes"
                    maxLength={500}
                    placeholder="Optional"
                    disabled={!goals.length}
                  />
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                Savings entries track progress only. They are not expense
                transactions and do not increase monthly spending.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!goals.length || saving || !!error}>
                  Record savings
                </Button>
                <p role="status" className="text-sm text-muted-foreground">
                  {depositStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Savings goals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.length ? (
                  goals.map((goal) => {
                    const snapshot = savingsGoalSnapshot(goal, deposits, today);
                    const hasDeposits = deposits.some(
                      (deposit) => deposit.goalId === goal.id,
                    );
                    return (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium">
                          {goal.name}
                        </TableCell>
                        <TableCell>{goal.destination ?? "—"}</TableCell>
                        <TableCell>
                          <span className={statusClass(snapshot.status)}>
                            {snapshot.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(snapshot.remaining)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(goal.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={hasDeposits || saving || !!error}
                              title={
                                hasDeposits
                                  ? "Pause goals with savings history"
                                  : "Delete goal"
                              }
                              onClick={() => void removeGoal(goal)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No savings goals yet.
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
            Recent savings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.length ? (
                  deposits.slice(0, 20).map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{deposit.depositDate}</TableCell>
                      <TableCell className="font-medium">
                        {goals.find((goal) => goal.id === deposit.goalId)?.name ??
                          "Archived goal"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(deposit.amount)}
                      </TableCell>
                      <TableCell>{deposit.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal break-words text-muted-foreground">
                        {deposit.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={saving || !!error}
                          onClick={() => void removeDeposit(deposit)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No savings recorded yet.
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
