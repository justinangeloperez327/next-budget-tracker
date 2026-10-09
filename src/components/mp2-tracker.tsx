"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useBudget } from "@/components/budget-provider";
import {
  mp2AccountSnapshot,
  mp2DividendOptions,
  type Mp2Account,
  type Mp2Deposit,
} from "@/lib/mp2";
import { phpMoney } from "@/lib/government";
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

function toCentavos(value: FormDataEntryValue | null, optional = false) {
  if (optional && String(value ?? "").trim() === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  const centavos = Math.round(number * 100);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function formatDate(value: string | undefined) {
  if (!value) return "Not started";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
}

export function Mp2Tracker() {
  const { data, save, saving, error } = useBudget();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState("");
  const [depositStatus, setDepositStatus] = useState("");
  const editingAccount = accounts.find((entry) => entry.id === editingId);
  const today = new Date().toLocaleDateString("en-CA");
  const snapshots = accounts.map((account) =>
    mp2AccountSnapshot(account, deposits, today),
  );
  const totalSaved = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.totalSaved,
    0,
  );
  const ytdSaved = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.ytdSaved,
    0,
  );
  const nextMaturity = snapshots
    .filter(
      (snapshot) =>
        snapshot.maturityDate && snapshot.maturityStatus === "Active",
    )
    .toSorted((a, b) =>
      (a.maturityDate ?? "").localeCompare(b.maturityDate ?? ""),
    )[0];

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const monthlyTarget = toCentavos(formData.get("monthly-target"), true);
    if (monthlyTarget === null) {
      setAccountStatus("Enter a valid monthly savings target.");
      return;
    }
    const accountNumber = optionalText(formData.get("account-number"));
    if (
      accountNumber &&
      accounts.some(
        (entry) =>
          entry.id !== editingAccount?.id &&
          entry.accountNumber === accountNumber,
      )
    ) {
      setAccountStatus("That MP2 account number is already recorded.");
      return;
    }

    const account: Mp2Account = {
      id: editingAccount?.id ?? crypto.randomUUID(),
      name: String(formData.get("name")).trim(),
      dividendOption: String(
        formData.get("dividend-option"),
      ) as Mp2Account["dividendOption"],
      active: formData.get("active") === "on",
      ...(accountNumber ? { accountNumber } : {}),
      ...(optionalText(formData.get("initial-payment-date"))
        ? {
            initialPaymentDate: optionalText(
              formData.get("initial-payment-date"),
            ),
          }
        : {}),
      ...(monthlyTarget === undefined ? {} : { monthlyTarget }),
    };

    const saved = await save({
      ...data,
      mp2Accounts: [
        ...accounts.filter((entry) => entry.id !== account.id),
        account,
      ],
      mp2Deposits: deposits,
    });
    if (saved) {
      form.reset();
      setEditingId(null);
      setAccountStatus("MP2 account saved.");
    }
  }

  async function addDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepositStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const accountId = String(formData.get("account-id"));
    const account = accounts.find((entry) => entry.id === accountId);
    if (!account) {
      setDepositStatus("Select an MP2 account.");
      return;
    }
    const amount = toCentavos(formData.get("amount"));
    if (amount === null || amount === undefined || amount <= 0) {
      setDepositStatus("Enter a valid savings amount.");
      return;
    }
    const paymentDate = String(formData.get("payment-date"));
    const deposit: Mp2Deposit = {
      id: crypto.randomUUID(),
      accountId,
      paymentDate,
      amount,
      ...(optionalText(formData.get("reference"))
        ? { referenceNumber: optionalText(formData.get("reference")) }
        : {}),
      ...(optionalText(formData.get("notes"))
        ? { notes: optionalText(formData.get("notes")) }
        : {}),
    };

    const saved = await save({
      ...data,
      mp2Accounts: accounts.map((entry) =>
        entry.id === account.id && !entry.initialPaymentDate
          ? { ...entry, initialPaymentDate: paymentDate }
          : entry,
      ),
      mp2Deposits: [...deposits, deposit],
    });
    if (saved) {
      form.reset();
      setDepositStatus("MP2 savings recorded.");
    }
  }

  async function removeDeposit(id: string) {
    await save({
      ...data,
      mp2Accounts: accounts,
      mp2Deposits: deposits.filter((entry) => entry.id !== id),
    });
  }

  return (
    <>
      <div>
        <p className="eyebrow">Pag-IBIG savings</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          MP2 Savings tracker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track one or more Modified Pag-IBIG II accounts, deposits, monthly
          savings targets, dividend option, and five-year maturity.
        </p>
        <Link
          href="/mp2/history"
          className="mt-3 inline-block text-sm underline underline-offset-4"
        >
          View full MP2 savings history
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total savings recorded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(totalSaved)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved this year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(ytdSaved)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MP2 accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {accounts.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {accounts.filter((entry) => entry.active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next maturity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium">
              {nextMaturity
                ? formatDate(nextMaturity.maturityDate)
                : "Not scheduled"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nextMaturity?.account.name ?? "Set an initial payment date"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.account.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-medium">
                    {snapshot.account.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {snapshot.account.accountNumber ?? "MP2 account no. not set"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(snapshot.account.id)}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Recorded savings</p>
                <p className="mt-1 font-medium tabular-nums">
                  {phpMoney(snapshot.totalSaved)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dividend option</p>
                <p className="mt-1 font-medium">
                  {snapshot.account.dividendOption}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maturity</p>
                <p className="mt-1 font-medium">
                  {formatDate(snapshot.maturityDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 font-medium">
                  {snapshot.account.active
                    ? snapshot.maturityStatus
                    : "Inactive"}
                </p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    This month
                    {snapshot.account.monthlyTarget
                      ? ` · target ${phpMoney(snapshot.account.monthlyTarget)}`
                      : ""}
                  </span>
                  <span className="tabular-nums">
                    {phpMoney(snapshot.currentMonthSaved)}
                  </span>
                </div>
                {snapshot.account.monthlyTarget ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width:
                          Math.min(100, snapshot.monthlyTargetProgress) + "%",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!snapshots.length && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Add your first MP2 account to start tracking savings and maturity.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {editingAccount ? "Edit MP2 account" : "Add MP2 account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={editingAccount?.id ?? "new"}
              className="space-y-4"
              onSubmit={saveAccount}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mp2-name">Account name</Label>
                  <Input
                    id="mp2-name"
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={editingAccount?.name ?? ""}
                    placeholder="e.g. MP2 Retirement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-number">MP2 account number</Label>
                  <Input
                    id="mp2-number"
                    name="account-number"
                    maxLength={40}
                    defaultValue={editingAccount?.accountNumber ?? ""}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-dividend">Dividend option</Label>
                  <select
                    id="mp2-dividend"
                    name="dividend-option"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={editingAccount?.dividendOption ?? "Compounded"}
                  >
                    {mp2DividendOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-initial-payment">
                    Initial payment date
                  </Label>
                  <Input
                    id="mp2-initial-payment"
                    name="initial-payment-date"
                    type="date"
                    defaultValue={editingAccount?.initialPaymentDate ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mp2-monthly-target">
                    Monthly savings target (PHP)
                  </Label>
                  <Input
                    id="mp2-monthly-target"
                    name="monthly-target"
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    defaultValue={
                      editingAccount?.monthlyTarget === undefined
                        ? ""
                        : editingAccount.monthlyTarget / 100
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editingAccount?.active ?? true}
                  className="size-4"
                />
                Active MP2 account
              </label>
              <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                MP2 has a five-year term from the initial payment. The current
                official minimum savings reference is PHP 500. Dividend rates
                are declared by Pag-IBIG, so this tracker does not project
                future dividends.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={saving || !!error}>Save MP2 account</Button>
                {editingAccount ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
                <p role="status" className="text-sm text-muted-foreground">
                  {accountStatus}
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Record MP2 savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={addDeposit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mp2-account">MP2 account</Label>
                  <select
                    id="mp2-account"
                    name="account-id"
                    required
                    disabled={!accounts.length}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select account
                    </option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-payment-date">Payment date</Label>
                  <Input
                    id="mp2-payment-date"
                    name="payment-date"
                    type="date"
                    required
                    disabled={!accounts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-amount">Savings amount (PHP)</Label>
                  <Input
                    id="mp2-amount"
                    name="amount"
                    type="number"
                    min="500"
                    max="99999999"
                    step="0.01"
                    required
                    disabled={!accounts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-reference">Reference number</Label>
                  <Input
                    id="mp2-reference"
                    name="reference"
                    maxLength={80}
                    placeholder="Optional"
                    disabled={!accounts.length}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp2-notes">Notes</Label>
                  <Input
                    id="mp2-notes"
                    name="notes"
                    maxLength={500}
                    placeholder="Optional"
                    disabled={!accounts.length}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!accounts.length || saving || !!error}>
                  Add MP2 savings
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
          <CardTitle className="text-base font-medium">
            Recent MP2 savings
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.length ? (
                  deposits.slice(0, 12).map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{deposit.paymentDate}</TableCell>
                      <TableCell className="font-medium">
                        {accounts.find((entry) => entry.id === deposit.accountId)
                          ?.name ?? "Unknown account"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {phpMoney(deposit.amount)}
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
                          disabled={saving}
                          onClick={() => void removeDeposit(deposit.id)}
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
                      No MP2 savings records yet.
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
