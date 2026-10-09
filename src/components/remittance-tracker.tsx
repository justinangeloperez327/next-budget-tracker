"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  categories,
  money,
  type Category,
  type Expense,
} from "@/lib/budget";
import {
  phpMoney,
  remittanceDestinationTypes,
  remittanceEffectiveRate,
  remittanceExpenseAmount,
  remittanceMonthSummary,
  remittanceStatuses,
  type Remittance,
  type RemittanceDestinationType,
  type RemittanceStatus,
} from "@/lib/remittance";
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

function positiveCents(value: FormDataEntryValue | null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function nonNegativeCents(value: FormDataEntryValue | null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function optionalPositiveCents(value: FormDataEntryValue | null) {
  if (String(value ?? "").trim() === "") return undefined;
  return positiveCents(value);
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function RemittanceTracker() {
  const { data, save, saving, error } = useBudget();
  const remittances = useMemo(
    () =>
      (data.remittances ?? []).toSorted(
        (a, b) =>
          b.transferDate.localeCompare(a.transferDate) ||
          b.id.localeCompare(a.id),
      ),
    [data.remittances],
  );
  const today = new Date().toLocaleDateString("en-CA");
  const month = today.slice(0, 7);
  const summary = remittanceMonthSummary(remittances, month);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const editing = remittances.find((entry) => entry.id === editingId);

  async function saveRemittance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    const recipient = String(formData.get("recipient") ?? "").trim();
    const destinationType = String(
      formData.get("destination-type") ?? "",
    ) as RemittanceDestinationType;
    const provider = optionalText(formData.get("provider"));
    const sentAmount = positiveCents(formData.get("sent-amount"));
    const feeAmount = nonNegativeCents(formData.get("fee-amount"));
    const receivedAmount = optionalPositiveCents(formData.get("received-amount"));
    const transferDate = String(formData.get("transfer-date") ?? "");
    const remittanceStatus = String(
      formData.get("status") ?? "",
    ) as RemittanceStatus;
    const principalAsExpense = formData.get("principal-as-expense") === "on";
    const category = String(formData.get("category") ?? "") as Category;

    if (
      !recipient ||
      !remittanceDestinationTypes.includes(destinationType) ||
      sentAmount === null ||
      feeAmount === null ||
      receivedAmount === null ||
      !transferDate ||
      !remittanceStatuses.includes(remittanceStatus) ||
      !categories.includes(category)
    ) {
      setStatusMessage("Check the remittance details and amounts.");
      return;
    }
    if (remittanceStatus === "Completed" && receivedAmount === undefined) {
      setStatusMessage("Enter the PHP amount received for a completed transfer.");
      return;
    }

    const draft: Remittance = {
      id: editing?.id ?? crypto.randomUUID(),
      recipient,
      destinationType,
      sentAmount,
      feeAmount,
      transferDate,
      status: remittanceStatus,
      principalAsExpense,
      category,
      ...(provider ? { provider } : {}),
      ...(receivedAmount === undefined ? {} : { receivedAmount }),
      ...(optionalText(formData.get("reference"))
        ? { referenceNumber: optionalText(formData.get("reference")) }
        : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const expenseAmount = remittanceExpenseAmount(draft);
    const expenseId =
      expenseAmount > 0 ? editing?.expenseId ?? crypto.randomUUID() : undefined;
    const entry: Remittance = expenseId ? { ...draft, expenseId } : draft;

    const expenses = data.expenses.filter(
      (expense) => expense.id !== editing?.expenseId,
    );
    if (expenseId) {
      const expense: Expense = {
        id: expenseId,
        description: `Remittance · ${recipient}`.slice(0, 120),
        amount: expenseAmount,
        category,
        date: transferDate,
      };
      expenses.push(expense);
    }

    const saved = await save({
      ...data,
      expenses,
      remittances: [
        ...remittances.filter((item) => item.id !== entry.id),
        entry,
      ],
    });

    if (saved) {
      form.reset();
      setEditingId(null);
      setStatusMessage("Remittance saved.");
    }
  }

  async function removeRemittance(entry: Remittance) {
    const saved = await save({
      ...data,
      expenses: entry.expenseId
        ? data.expenses.filter((expense) => expense.id !== entry.expenseId)
        : data.expenses,
      remittances: remittances.filter((item) => item.id !== entry.id),
    });
    if (saved && editingId === entry.id) setEditingId(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">OFW money movement</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Remittance tracker
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track AED sent from the UAE, PHP received in the Philippines,
            transfer fees, providers, recipients, and actual exchange outcomes.
          </p>
        </div>
        <Link
          href="/remittances/history"
          className="text-sm underline underline-offset-4"
        >
          View remittance history
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(summary.sentAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.count} transfer{summary.count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transfer fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {money(summary.feeAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received in PHP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(summary.receivedAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.effectiveRate
                ? `Effective ₱${summary.effectiveRate.toFixed(2)} / AED`
                : "No completed transfer rate yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {summary.pendingCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.completedCount} completed this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {editing ? "Edit remittance" : "Add remittance"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editing?.id ?? "new"}
              className="space-y-4"
              onSubmit={saveRemittance}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="remittance-recipient">Recipient / account</Label>
                  <Input
                    id="remittance-recipient"
                    name="recipient"
                    required
                    maxLength={120}
                    defaultValue={editing?.recipient ?? ""}
                    placeholder="e.g. Family or PH savings account"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-destination">
                    Destination type
                  </Label>
                  <select
                    id="remittance-destination"
                    name="destination-type"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editing?.destinationType ?? "Family / person"}
                  >
                    {remittanceDestinationTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-provider">Provider</Label>
                  <Input
                    id="remittance-provider"
                    name="provider"
                    maxLength={120}
                    defaultValue={editing?.provider ?? ""}
                    placeholder="e.g. bank or exchange house"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-date">Transfer date</Label>
                  <Input
                    id="remittance-date"
                    name="transfer-date"
                    type="date"
                    required
                    defaultValue={editing?.transferDate ?? today}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-sent">Amount sent (AED)</Label>
                  <Input
                    id="remittance-sent"
                    name="sent-amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    required
                    defaultValue={editing ? editing.sentAmount / 100 : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-fee">Fee (AED)</Label>
                  <Input
                    id="remittance-fee"
                    name="fee-amount"
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    required
                    defaultValue={editing ? editing.feeAmount / 100 : "0"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-received">
                    Amount received (PHP)
                  </Label>
                  <Input
                    id="remittance-received"
                    name="received-amount"
                    type="number"
                    min="0.01"
                    max="99999999"
                    step="0.01"
                    defaultValue={
                      editing?.receivedAmount
                        ? editing.receivedAmount / 100
                        : ""
                    }
                    placeholder="Required when completed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-status">Status</Label>
                  <select
                    id="remittance-status"
                    name="status"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editing?.status ?? "Completed"}
                  >
                    {remittanceStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-category">Expense category</Label>
                  <select
                    id="remittance-category"
                    name="category"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editing?.category ?? "Other"}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remittance-reference">Reference</Label>
                  <Input
                    id="remittance-reference"
                    name="reference"
                    maxLength={80}
                    defaultValue={editing?.referenceNumber ?? ""}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="remittance-notes">Notes</Label>
                  <Input
                    id="remittance-notes"
                    name="notes"
                    maxLength={500}
                    defaultValue={editing?.notes ?? ""}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  name="principal-as-expense"
                  type="checkbox"
                  className="mt-0.5 size-4"
                  defaultChecked={editing?.principalAsExpense ?? true}
                />
                <span>
                  Count the remitted principal as spending
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Keep this checked for family support or money you consider
                    spent. Uncheck it for transfers to your own account. Transfer
                    fees always count as an expense.
                  </span>
                </span>
              </label>

              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                The exchange rate shown by the tracker is calculated from your
                entered AED sent and PHP received. No live FX rate is applied.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={saving || !!error}>Save remittance</Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <p role="status" className="text-sm text-muted-foreground">
                  {statusMessage}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Recent remittances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">AED sent</TableHead>
                    <TableHead className="text-right">PHP received</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remittances.length ? (
                    remittances.slice(0, 20).map((entry) => {
                      const rate = remittanceEffectiveRate(entry);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.transferDate}</TableCell>
                          <TableCell>
                            <p className="font-medium">{entry.recipient}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.provider ?? entry.destinationType}
                            </p>
                          </TableCell>
                          <TableCell>{entry.status}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(entry.sentAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.receivedAmount
                              ? phpMoney(entry.receivedAmount)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {rate ? `₱${rate.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(entry.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={saving || !!error}
                                onClick={() => void removeRemittance(entry)}
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
                        colSpan={7}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No remittances recorded yet.
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
