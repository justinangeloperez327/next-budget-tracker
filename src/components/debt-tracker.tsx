"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  debtDashboardSnapshot,
  debtSnapshot,
  type Debt,
  type DebtPayment,
} from "@/lib/debt";
import {
  categories,
  money,
  type Category,
  type Expense,
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
  if (status === "Overdue") return "text-destructive";
  if (status === "Paid off") return "text-primary";
  return "text-muted-foreground";
}

export function DebtTracker() {
  const { data, save, saving, error } = useBudget();
  const debts = data.debts ?? [];
  const payments = useMemo(
    () =>
      (data.debtPayments ?? []).toSorted(
        (a, b) =>
          b.paymentDate.localeCompare(a.paymentDate) ||
          b.id.localeCompare(a.id),
      ),
    [data.debtPayments],
  );
  const today = new Date().toLocaleDateString("en-CA");
  const dashboard = debtDashboardSnapshot(debts, payments, today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [debtStatus, setDebtStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const editingDebt = debts.find((debt) => debt.id === editingId);

  async function saveDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDebtStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const originalAmount = toCents(formData.get("original-amount"));
    const monthlyTarget = toCents(formData.get("monthly-target"), true);
    const name = String(formData.get("name")).trim();
    const lender = String(formData.get("lender")).trim();
    const startDate = String(formData.get("start-date"));
    const dueDate = optionalText(formData.get("due-date"));

    if (
      !name ||
      !lender ||
      originalAmount === null ||
      originalAmount === undefined ||
      monthlyTarget === null ||
      !startDate ||
      (dueDate && dueDate < startDate)
    ) {
      setDebtStatus("Check the debt details, amount, and dates.");
      return;
    }

    const alreadyPaid = editingDebt
      ? debtSnapshot(editingDebt, payments, today).totalPaid
      : 0;
    if (originalAmount < alreadyPaid) {
      setDebtStatus(
        "Original amount cannot be lower than repayments already recorded.",
      );
      return;
    }

    const debt: Debt = {
      id: editingDebt?.id ?? crypto.randomUUID(),
      name,
      lender,
      originalAmount,
      category: String(formData.get("category")) as Category,
      startDate,
      active: formData.get("active") === "on",
      ...(dueDate ? { dueDate } : {}),
      ...(monthlyTarget === undefined ? {} : { monthlyTarget }),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const linkedExpenseIds = new Set(
      payments
        .filter((payment) => payment.debtId === debt.id)
        .map((payment) => payment.expenseId),
    );
    const saved = await save({
      ...data,
      expenses: data.expenses.map((expense) =>
        linkedExpenseIds.has(expense.id)
          ? {
              ...expense,
              description: `Debt payment · ${debt.name}`.slice(0, 120),
              category: debt.category,
            }
          : expense,
      ),
      debts: [...debts.filter((entry) => entry.id !== debt.id), debt],
      debtPayments: payments,
    });
    if (saved) {
      form.reset();
      setEditingId(null);
      setDebtStatus("Debt saved.");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const debtId = String(formData.get("debt-id"));
    const debt = debts.find((entry) => entry.id === debtId);
    if (!debt) {
      setPaymentStatus("Select a debt.");
      return;
    }
    if (!debt.active) {
      setPaymentStatus("Activate this debt before recording a repayment.");
      return;
    }

    const amount = toCents(formData.get("amount"));
    const paymentDate = String(formData.get("payment-date"));
    if (amount === null || amount === undefined || !paymentDate) {
      setPaymentStatus("Enter a valid payment amount and date.");
      return;
    }

    const snapshot = debtSnapshot(debt, payments, today);
    if (amount > snapshot.remaining) {
      setPaymentStatus(
        `Payment exceeds the remaining balance of ${money(snapshot.remaining)}.`,
      );
      return;
    }

    const expenseId = crypto.randomUUID();
    const payment: DebtPayment = {
      id: crypto.randomUUID(),
      debtId,
      amount,
      paymentDate,
      expenseId,
      ...(optionalText(formData.get("reference"))
        ? { referenceNumber: optionalText(formData.get("reference")) }
        : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };
    const expense: Expense = {
      id: expenseId,
      description: `Debt payment · ${debt.name}`.slice(0, 120),
      amount,
      category: debt.category,
      date: paymentDate,
    };

    const saved = await save({
      ...data,
      expenses: [...data.expenses, expense],
      debts,
      debtPayments: [...payments, payment],
    });
    if (saved) {
      form.reset();
      setPaymentStatus("Debt payment recorded.");
    }
  }

  async function removePayment(payment: DebtPayment) {
    await save({
      ...data,
      expenses: data.expenses.filter(
        (expense) => expense.id !== payment.expenseId,
      ),
      debts,
      debtPayments: payments.filter((entry) => entry.id !== payment.id),
    });
  }

  async function removeDebt(debt: Debt) {
    if (payments.some((payment) => payment.debtId === debt.id)) {
      setDebtStatus(
        "Deactivate debts with repayment history instead of deleting them.",
      );
      return;
    }
    const saved = await save({
      ...data,
      debts: debts.filter((entry) => entry.id !== debt.id),
      debtPayments: payments,
    });
    if (saved && editingId === debt.id) setEditingId(null);
  }

  return (
    <>
      <div>
        <p className="eyebrow">Debt management</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Debt / Utang tracker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track money you owe, repayment progress, due dates, and monthly
          repayment targets. Repayments create one linked expense so your
          budget reflects the actual cash outflow.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Original debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.originalDebt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.totalPaid)}
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
              {money(dashboard.remaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.activeCount} active debts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                dashboard.overdueCount
                  ? "text-2xl font-medium tabular-nums text-destructive"
                  : "text-2xl font-medium tabular-nums"
              }
            >
              {dashboard.overdueCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              overdue · {dashboard.paidOffCount} paid off
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {dashboard.snapshots.map((snapshot) => (
          <Card key={snapshot.debt.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-medium">
                    {snapshot.debt.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Owed to {snapshot.debt.lender}
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
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(snapshot.remaining)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Repaid</p>
                  <p className="mt-1 font-medium tabular-nums">
                    {money(snapshot.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due date</p>
                  <p className="mt-1 font-medium">
                    {snapshot.debt.dueDate ?? "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last payment</p>
                  <p className="mt-1 font-medium">
                    {snapshot.lastPayment?.paymentDate ?? "No payment yet"}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Repayment progress</span>
                  <span>{Math.round(snapshot.progressRate)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: Math.min(100, snapshot.progressRate) + "%" }}
                  />
                </div>
              </div>
              {snapshot.debt.monthlyTarget ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      This month · target {money(snapshot.debt.monthlyTarget)}
                    </span>
                    <span>{money(snapshot.currentMonthPaid)}</span>
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
              Add your first debt to start tracking repayment progress.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {editingDebt ? "Edit debt" : "Add debt"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editingDebt?.id ?? "new"}
              className="space-y-4"
              onSubmit={saveDebt}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="debt-name">Debt name</Label>
                  <Input
                    id="debt-name"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={editingDebt?.name ?? ""}
                    placeholder="e.g. Personal loan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-lender">Lender / creditor</Label>
                  <Input
                    id="debt-lender"
                    name="lender"
                    required
                    maxLength={120}
                    defaultValue={editingDebt?.lender ?? ""}
                    placeholder="Bank, person, or company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-original">Original amount owed (AED)</Label>
                  <Input
                    id="debt-original"
                    name="original-amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    required
                    defaultValue={
                      editingDebt ? editingDebt.originalAmount / 100 : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-category">Expense category</Label>
                  <select
                    id="debt-category"
                    name="category"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editingDebt?.category ?? "Other"}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-start">Start date</Label>
                  <Input
                    id="debt-start"
                    name="start-date"
                    type="date"
                    required
                    defaultValue={editingDebt?.startDate ?? today}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-due">Final due date</Label>
                  <Input
                    id="debt-due"
                    name="due-date"
                    type="date"
                    defaultValue={editingDebt?.dueDate ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="debt-target">
                    Monthly repayment target (AED)
                  </Label>
                  <Input
                    id="debt-target"
                    name="monthly-target"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    defaultValue={
                      editingDebt?.monthlyTarget
                        ? editingDebt.monthlyTarget / 100
                        : ""
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="debt-notes">Notes</Label>
                  <Input
                    id="debt-notes"
                    name="notes"
                    maxLength={500}
                    defaultValue={editingDebt?.notes ?? ""}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  className="size-4"
                  defaultChecked={editingDebt?.active ?? true}
                />
                Active debt
              </label>
              <p className="text-xs leading-5 text-muted-foreground">
                Enter the total amount you intend to repay. No interest formula
                is applied automatically.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={saving || !!error}>Save debt</Button>
                {editingDebt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <p role="status" className="text-sm text-muted-foreground">
                  {debtStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Record repayment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={recordPayment}>
              <div className="space-y-2">
                <Label htmlFor="debt-payment-debt">Debt</Label>
                <select
                  id="debt-payment-debt"
                  name="debt-id"
                  required
                  disabled={!debts.length}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select debt
                  </option>
                  {debts
                    .filter(
                      (debt) =>
                        debt.active &&
                        debtSnapshot(debt, payments, today).remaining > 0,
                    )
                    .map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.name} · {money(debtSnapshot(debt, payments, today).remaining)} remaining
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="debt-payment-amount">Amount (AED)</Label>
                  <Input
                    id="debt-payment-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    required
                    disabled={!debts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-payment-date">Payment date</Label>
                  <Input
                    id="debt-payment-date"
                    name="payment-date"
                    type="date"
                    required
                    defaultValue={today}
                    disabled={!debts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-payment-reference">Reference</Label>
                  <Input
                    id="debt-payment-reference"
                    name="reference"
                    maxLength={80}
                    placeholder="Optional"
                    disabled={!debts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-payment-notes">Notes</Label>
                  <Input
                    id="debt-payment-notes"
                    name="notes"
                    maxLength={500}
                    placeholder="Optional"
                    disabled={!debts.length}
                  />
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                Each repayment creates one linked expense using this debt’s
                category. Delete the repayment here to reverse that expense.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!debts.length || saving || !!error}>
                  Record repayment
                </Button>
                <p role="status" className="text-sm text-muted-foreground">
                  {paymentStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Debt accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debt</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.length ? (
                  debts.map((debt) => {
                    const snapshot = debtSnapshot(debt, payments, today);
                    const hasPayments = payments.some(
                      (payment) => payment.debtId === debt.id,
                    );
                    return (
                      <TableRow key={debt.id}>
                        <TableCell className="font-medium">
                          {debt.name}
                        </TableCell>
                        <TableCell>{debt.lender}</TableCell>
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
                              onClick={() => setEditingId(debt.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={hasPayments || saving || !!error}
                              title={
                                hasPayments
                                  ? "Deactivate debts with repayment history"
                                  : "Delete debt"
                              }
                              onClick={() => void removeDebt(debt)}
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
                      No debts recorded yet.
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
            Recent repayments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Debt</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length ? (
                  payments.slice(0, 20).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell className="font-medium">
                        {debts.find((debt) => debt.id === payment.debtId)?.name ??
                          "Archived debt"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal break-words text-muted-foreground">
                        {payment.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={saving || !!error}
                          onClick={() => void removePayment(payment)}
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
                      No debt repayments recorded yet.
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
