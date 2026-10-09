"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CircleAlert,
  Info,
} from "lucide-react";
import { useBudget } from "@/components/budget-provider";
import { money } from "@/lib/budget";
import { phpMoney } from "@/lib/government";
import {
  financialReminders,
  reminderSummary,
  type ReminderSeverity,
} from "@/lib/reminders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const filters = ["all", "overdue", "due-soon", "pending", "info"] as const;
type Filter = (typeof filters)[number];

function labelForFilter(filter: Filter) {
  if (filter === "all") return "All";
  if (filter === "due-soon") return "Due soon";
  if (filter === "overdue") return "Overdue";
  if (filter === "pending") return "Pending";
  return "Info";
}

function severityLabel(severity: ReminderSeverity) {
  if (severity === "due-soon") return "Due soon";
  if (severity === "overdue") return "Overdue";
  if (severity === "pending") return "Pending";
  return "Info";
}

function SeverityIcon({ severity }: { severity: ReminderSeverity }) {
  if (severity === "overdue")
    return <AlertTriangle className="size-4 text-destructive" />;
  if (severity === "due-soon")
    return <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" />;
  if (severity === "pending")
    return <CircleAlert className="size-4 text-muted-foreground" />;
  return <Info className="size-4 text-muted-foreground" />;
}

export function ReminderCenter() {
  const { data } = useBudget();
  const today = new Date().toLocaleDateString("en-CA");
  const reminders = useMemo(() => financialReminders(data, today), [data, today]);
  const summary = useMemo(() => reminderSummary(reminders), [reminders]);
  const [filter, setFilter] = useState<Filter>("all");
  const visible =
    filter === "all"
      ? reminders
      : reminders.filter((entry) => entry.severity === filter);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">In-app reminders</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">
            Financial reminders
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Actionable reminders generated from your bills, debts, Philippine
            contributions, savings targets, MP2, and remittances. These are
            shown inside the app; external push or email delivery is not enabled.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">As of {today}</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                summary.overdue
                  ? "text-2xl font-medium tabular-nums text-destructive"
                  : "text-2xl font-medium tabular-nums"
              }
            >
              {summary.overdue}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">{summary.dueSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">{summary.pending}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((entry) => (
          <Button
            key={entry}
            type="button"
            size="sm"
            variant={filter === entry ? "default" : "outline"}
            onClick={() => setFilter(entry)}
          >
            {labelForFilter(entry)}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {visible.length ? (
          visible.map((reminder) => (
            <Link
              href={reminder.href}
              key={reminder.id}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <SeverityIcon severity={reminder.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {reminder.detail}
                      </p>
                    </div>
                    <span
                      className={
                        reminder.severity === "overdue"
                          ? "rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"
                          : "rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                      }
                    >
                      {severityLabel(reminder.severity)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{reminder.source}</span>
                    {reminder.dueDate ? <span>{reminder.dueDate}</span> : null}
                    {reminder.amount !== undefined && reminder.currency ? (
                      <span className="font-medium tabular-nums text-foreground">
                        {reminder.currency === "AED"
                          ? money(reminder.amount)
                          : phpMoney(reminder.amount)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="flex min-h-36 items-center gap-3 py-8 text-sm text-muted-foreground">
              <BellRing className="size-5" />
              No reminders match this filter.
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Reminder rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Bills are surfaced when overdue or due within 7 days.</p>
          <p>Debt and savings target dates are surfaced within 30 days.</p>
          <p>MP2 maturity is surfaced within 60 days, plus monthly target progress.</p>
          <p>
            Government contribution gaps remain “no record” unless you explicitly
            mark a contribution as missed.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
