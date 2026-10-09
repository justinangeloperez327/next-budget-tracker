"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  billFrequencies,
  billOccurrencesForPeriod,
  type BillPayment,
  type RecurringBill,
} from "@/lib/bills";
import { categories, money, type Expense } from "@/lib/budget";
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
  if (status === "Paid") return "text-primary";
  return "text-muted-foreground";
}

export function BillsTracker() {
  const { data, save, saving, error } = useBudget();
  const bills = data.recurringBills ?? [];
  const payments = useMemo(
    () =>
      (data.billPayments ?? []).toSorted(
        (a, b) =>
          b.paymentDate.localeCompare(a.paymentDate) ||
          b.period.localeCompare(a.period),
      ),
    [data.billPayments],
  );
  const today = new Date().toLocaleDateString("en-CA");
  const currentPeriod = today.slice(0, 7);
  const [period, setPeriod] = useState(currentPeriod);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [billStatus, setBillStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const editingBill = bills.find((bill) => bill.id === editingId);

  const occurrences = billOccurrencesForPeriod(bills, payments, period, today);
  const dashboard = {
    scheduled: occurrences.reduce((sum, entry) => sum + entry.bill.amount, 0),
    paid: occurrences.reduce(
      (sum, entry) => sum + (entry.payment?.amount ?? 0),
      0,
    ),
    outstanding: occurrences.reduce(
      (sum, entry) => sum + (entry.payment ? 0 : entry.bill.amount),
      0,
    ),
    overdue: occurrences.filter((entry) => entry.status === "Overdue").length,
    dueSoon: occurrences.filter((entry) => entry.status === "Due soon").length,
    paidCount: occurrences.filter((entry) => entry.status === "Paid").length,
  };

  async function saveBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBillStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = toCents(formData.get("amount"));
    if (amount === null) {
      setBillStatus("Enter a valid bill amount.");
      return;
    }
    const startMonth = String(formData.get("start-month"));
    const endMonth = optionalText(formData.get("end-month"));
    if (endMonth && endMonth < startMonth) {
      setBillStatus("End month cannot be before the start month.");
      return;
    }

    const bill: RecurringBill = {
      id: editingBill?.id ?? crypto.randomUUID(),
      name: String(formData.get("name")).trim(),
      category: String(formData.get("category")) as RecurringBill["category"],
      amount,
      frequency: String(
        formData.get("frequency"),
      ) as RecurringBill["frequency"],
      dueDay: Number(formData.get("due-day")),
      startMonth,
      active: formData.get("active") === "on",
      ...(endMonth ? { endMonth } : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const linkedExpenseIds = new Set(
      payments
        .filter((payment) => payment.billId === bill.id)
        .map((payment) => payment.expenseId),
    );
    const saved = await save({
      ...data,
      expenses: data.expenses.map((expense) =>
        linkedExpenseIds.has(expense.id)
          ? { ...expense, description: bill.name, category: bill.category }
          : expense,
      ),
      recurringBills: [
        ...bills.filter((entry) => entry.id !== bill.id),
        bill,
      ],
      billPayments: payments,
    });
    if (saved) {
      form.reset();
      setEditingId(null);
      setBillStatus("Recurring bill saved.");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const billId = String(formData.get("bill-id"));
    const paymentPeriod = String(formData.get("period"));
    const bill = bills.find((entry) => entry.id === billId);
    if (!bill) {
      setPaymentStatus("Select a bill.");
      return;
    }
    if (
      payments.some(
        (entry) =>
          entry.billId === billId && entry.period === paymentPeriod,
      )
    ) {
      setPaymentStatus("This bill is already marked paid for that period.");
      return;
    }
    const amount = toCents(formData.get("amount"));
    if (amount === null) {
      setPaymentStatus("Enter a valid payment amount.");
      return;
    }

    const paymentDate = String(formData.get("payment-date"));
    const expenseId = crypto.randomUUID();
    const payment: BillPayment = {
      id: crypto.randomUUID(),
      billId,
      period: paymentPeriod,
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
      description: bill.name,
      amount,
      category: bill.category,
      date: paymentDate,
    };

    const saved = await save({
      ...data,
      expenses: [...data.expenses, expense],
      recurringBills: bills,
      billPayments: [...payments, payment],
    });
    if (saved) {
      form.reset();
      setPaymentStatus("Bill payment recorded.");
    }
  }

  async function removeBill(id: string) {
    if (payments.some((payment) => payment.billId === id)) {
      setBillStatus(
        "Deactivate bills with payment history instead of deleting them.",
      );
      return;
    }
    await save({
      ...data,
      recurringBills: bills.filter((bill) => bill.id !== id),
      billPayments: payments,
    });
  }

  async function removePayment(id: string) {
    const payment = payments.find((entry) => entry.id === id);
    if (!payment) return;
    await save({
      ...data,
      expenses: data.expenses.filter(
        (expense) => expense.id !== payment.expenseId,
      ),
      recurringBills: bills,
      billPayments: payments.filter((entry) => entry.id !== id),
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Bills & recurring expenses</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Monthly obligations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Schedule recurring bills, monitor due dates, and record payments.
            Each paid bill creates one linked expense so Budget vs. Actual stays
            accurate without double counting.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bill-period">Viewing month</Label>
          <Input
            id="bill-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.scheduled)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {occurrences.length} recurring obligations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.paid)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.paidCount} bills recorded paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(dashboard.outstanding)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Planned amount not yet paid
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
                dashboard.overdue
                  ? "text-2xl font-medium tabular-nums text-destructive"
                  : "text-2xl font-medium tabular-nums"
              }
            >
              {dashboard.overdue}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.dueSoon} due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {period} bill schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.length ? (
                  occurrences.map((entry) => (
                    <TableRow key={entry.bill.id}>
                      <TableCell className="font-medium">
                        {entry.bill.name}
                      </TableCell>
                      <TableCell>{entry.bill.category}</TableCell>
                      <TableCell>{entry.dueDate}</TableCell>
                      <TableCell>
                        <span className={statusClass(entry.status)}>
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(entry.bill.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.payment ? money(entry.payment.amount) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No active recurring bills are scheduled for this month.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {editingBill ? "Edit recurring bill" : "Add recurring bill"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editingBill?.id ?? "new"}
              className="space-y-4"
              onSubmit={saveBill}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bill-name">Bill name</Label>
                  <Input
                    id="bill-name"
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={editingBill?.name ?? ""}
                    placeholder="e.g. Rent, electricity, internet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-category">Category</Label>
                  <select
                    id="bill-category"
                    name="category"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editingBill?.category ?? "Housing"}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-amount">Planned amount (AED)</Label>
                  <Input
                    id="bill-amount"
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    defaultValue={
                      editingBill ? editingBill.amount / 100 : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-frequency">Frequency</Label>
                  <select
                    id="bill-frequency"
                    name="frequency"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editingBill?.frequency ?? "Monthly"}
                  >
                    {billFrequencies.map((frequency) => (
                      <option key={frequency}>{frequency}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-due-day">Due day</Label>
                  <Input
                    id="bill-due-day"
                    name="due-day"
                    type="number"
                    min="1"
                    max="31"
                    required
                    defaultValue={editingBill?.dueDay ?? 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-start">Start month</Label>
                  <Input
                    id="bill-start"
                    name="start-month"
                    type="month"
                    required
                    defaultValue={editingBill?.startMonth ?? currentPeriod}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-end">End month</Label>
                  <Input
                    id="bill-end"
                    name="end-month"
                    type="month"
                    defaultValue={editingBill?.endMonth ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bill-notes">Notes</Label>
                  <Input
                    id="bill-notes"
                    name="notes"
                    maxLength={500}
                    defaultValue={editingBill?.notes ?? ""}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  className="size-4"
                  defaultChecked={editingBill?.active ?? true}
                />
                Active recurring bill
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={saving || !!error}>
                  Save recurring bill
                </Button>
                {editingBill ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <p role="status" className="text-sm text-muted-foreground">
                  {billStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Record bill payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={recordPayment}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="payment-bill">Bill</Label>
                  <select
                    id="payment-bill"
                    name="bill-id"
                    required
                    disabled={!bills.length}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select bill
                    </option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-period">Bill month</Label>
                  <Input
                    id="payment-period"
                    name="period"
                    type="month"
                    required
                    defaultValue={period}
                    disabled={!bills.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment date</Label>
                  <Input
                    id="payment-date"
                    name="payment-date"
                    type="date"
                    required
                    defaultValue={today}
                    disabled={!bills.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Actual paid (AED)</Label>
                  <Input
                    id="payment-amount"
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    disabled={!bills.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-reference">Reference</Label>
                  <Input
                    id="payment-reference"
                    name="reference"
                    maxLength={80}
                    placeholder="Optional"
                    disabled={!bills.length}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="payment-notes">Notes</Label>
                  <Input
                    id="payment-notes"
                    name="notes"
                    maxLength={500}
                    placeholder="Optional"
                    disabled={!bills.length}
                  />
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                Recording a bill payment creates one linked expense using the
                bill category and actual paid amount. Delete the payment here to
                reverse that linked expense.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!bills.length || saving || !!error}>
                  Record payment
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
          <CardTitle className="text-base font-medium">
            Recurring bill definitions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length ? (
                  bills
                    .toSorted((a, b) => a.dueDay - b.dueDay)
                    .map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          {bill.name}
                        </TableCell>
                        <TableCell>{bill.category}</TableCell>
                        <TableCell>{bill.frequency}</TableCell>
                        <TableCell>Day {bill.dueDay}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(bill.amount)}
                        </TableCell>
                        <TableCell>
                          {bill.active ? "Active" : "Inactive"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(bill.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={saving}
                              onClick={() => void removeBill(bill.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No recurring bills yet.
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
            Recent bill payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid date</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Bill month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length ? (
                  payments.slice(0, 20).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell className="font-medium">
                        {bills.find((bill) => bill.id === payment.billId)?.name ??
                          "Deleted bill"}
                      </TableCell>
                      <TableCell>{payment.period}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => void removePayment(payment.id)}
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
                      No bill payments recorded yet.
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
