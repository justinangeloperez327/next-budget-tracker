"use client";
import { NotebookNote } from "@/components/sakura-companion";
import { useState } from "react";
import { useBudget } from "@/components/budget-provider";
import { categories, money, total, csv, type Expense } from "@/lib/budget";
import { ExpenseEditor } from "@/components/expense-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function Expenses() {
  const { data, save, error, saving } = useBudget();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [month, setMonth] = useState(""),
    [deleting, setDeleting] = useState<Expense | null>(null);
  const filtered = data.expenses
    .filter(
      (e) =>
        e.description.toLowerCase().includes(search.toLowerCase()) &&
        (category === "All" || e.category === category) &&
        (!month || e.date.startsWith(month)),
    )
    .toSorted((a, b) => b.date.localeCompare(a.date));
  function download() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv(filtered)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Expense tracker
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Record, organise, and review your spending.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={download}
            disabled={!filtered.length}
          >
            Export CSV
          </Button>
          <ExpenseEditor />
        </div>
      </div>
      <div className="my-6 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search">Search expenses</Label>
          <Input
            id="search"
            placeholder="Find a transaction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-category">Category</Label>
          <select
            id="filter-category"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["All", ...categories].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-month">Month (blank for all)</Label>
          <Input
            id="filter-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} expenses · {money(total(filtered))}
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  {data.expenses.length ? (
                    "No expenses match your filters."
                  ) : (
                    <NotebookNote
                      title="Your notebook is ready"
                      className="mx-auto max-w-md text-left"
                    >
                      Add your first expense to start a clearer spending habit.
                    </NotebookNote>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-60 whitespace-normal">
                    {e.description}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs">
                      {e.category}
                    </span>
                  </TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(e.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ExpenseEditor expense={e} />
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        size="sm"
                        disabled={!!error || saving}
                        onClick={() => setDeleting(e)}
                        aria-label={`Delete ${e.description}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogDescription>
              This will remove {deleting?.description} from this device. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!!error || saving}
              onClick={async () => {
                if (
                  await save({
                    ...data,
                    expenses: data.expenses.filter(
                      (e) => e.id !== deleting?.id,
                    ),
                  })
                )
                  setDeleting(null);
              }}
            >
              Delete expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
