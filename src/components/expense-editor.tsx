"use client";
import { useState } from "react";
import { categories, type Expense } from "@/lib/budget";
import { useBudget } from "@/components/budget-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
export function ExpenseEditor({ expense }: { expense?: Expense }) {
  const { data, save, error } = useBudget();
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const description = String(f.get("description")).trim();
    const amount = Math.round(Number(f.get("amount")) * 100);
    if (!description || !Number.isSafeInteger(amount) || amount <= 0) {
      setMessage("Enter a description and a positive amount.");
      return;
    }
    const next: Expense = {
      id: expense?.id || crypto.randomUUID(),
      description,
      amount,
      category: String(f.get("category")) as Expense["category"],
      date: String(f.get("date")),
    };
    if (
      save({
        ...data,
        expenses: expense
          ? data.expenses.map((e) => (e.id === expense.id ? next : e))
          : [...data.expenses, next],
      })
    ) {
      setOpen(false);
      setMessage("");
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={expense ? "ghost" : "default"}
          size={expense ? "sm" : "default"}
          disabled={!!error}
        >
          {expense ? "Edit" : "Add expense"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>Record an expense in AED.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={expense?.description}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (AED)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              max="99999999"
              step="0.01"
              defaultValue={expense ? expense.amount / 100 : undefined}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue={expense?.category || "Food"}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={
                expense?.date || new Date().toLocaleDateString("en-CA")
              }
            />
          </div>
          <p role="status" className="text-sm text-destructive">
            {message || error}
          </p>
          <Button type="submit" disabled={!!error}>
            Save expense
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
