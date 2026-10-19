"use client";

import { useId, useMemo, useState } from "react";
import { money, type Expense } from "@/lib/budget";
import { monthlySpendingTrend } from "@/lib/spending-trend";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const WIDTH = 600;
const HEIGHT = 220;
const shortMoney = new Intl.NumberFormat("en-AE", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const dateLabel = new Intl.DateTimeFormat("en-AE", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function SpendingTrend({
  expenses,
  month,
  budget,
}: {
  expenses: Expense[];
  month: string;
  budget: number;
}) {
  const id = useId();
  const days = useMemo(
    () => monthlySpendingTrend(expenses, month),
    [expenses, month],
  );
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");
  const [day, setDay] = useState(
    () => days.findLast((entry) => entry.amount > 0)?.day ?? 1,
  );
  const selected = days[Math.min(day, days.length) - 1];
  const total = days.at(-1)?.cumulative ?? 0;
  const running = mode === "cumulative";
  const maximum = Math.max(
    100,
    running
      ? Math.max(total, budget)
      : Math.max(...days.map((entry) => entry.amount)),
  );
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const ceiling =
    ([1, 2, 2.5, 5, 10, 20].find(
      (step) => step * magnitude >= maximum * 1.05,
    ) ?? 20) * magnitude;
  const x = (index: number) => ((index + 0.5) / days.length) * WIDTH;
  const y = (amount: number) => HEIGHT - (amount / ceiling) * HEIGHT;
  const ticks = [ceiling, ceiling * 0.75, ceiling * 0.5, ceiling * 0.25, 0];
  const labels = days.filter(
    (entry) =>
      entry.day === 1 ||
      entry.day === 8 ||
      entry.day === 15 ||
      entry.day === 22 ||
      entry.day === days.length,
  );

  return (
    <Card className="mt-6" aria-labelledby={`${id}-title`}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 id={`${id}-title`} className="text-base font-medium">
            Spending trend
          </h2>
          <p
            id={`${id}-description`}
            className="mt-1 text-sm text-muted-foreground"
          >
            Recorded expenses for {month}. All amounts in AED.
          </p>
        </div>
        <div
          role="group"
          aria-label="Spending graph view"
          className="flex gap-1"
        >
          <Button
            type="button"
            size="sm"
            variant={running ? "secondary" : "ghost"}
            aria-pressed={running}
            onClick={() => setMode("cumulative")}
          >
            Running total
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!running ? "secondary" : "ghost"}
            aria-pressed={!running}
            onClick={() => setMode("daily")}
          >
            Daily
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!total || !selected ? (
          <div className="flex min-h-60 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium">
              No spending to plot this month
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add an expense to see your daily spending and running total here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-medium tabular-nums">
                  {money(running ? selected.cumulative : selected.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dateLabel.format(new Date(`${selected.date}T00:00:00Z`))} ·{" "}
                  {running ? "Spent through this day" : "Spent on this day"}
                </p>
              </div>
              {running && budget > 0 ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="w-6 border-t-2 border-dashed border-foreground"
                  />
                  Monthly budget · {money(budget)}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <div
                aria-hidden="true"
                className="flex h-[220px] w-14 shrink-0 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground"
              >
                {ticks.map((tick) => (
                  <span key={tick}>{shortMoney.format(tick / 100)}</span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <svg
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  preserveAspectRatio="none"
                  className="block h-[220px] w-full overflow-visible"
                  role="img"
                  aria-labelledby={`${id}-title`}
                  aria-describedby={`${id}-description ${id}-summary`}
                  onPointerMove={(event) => {
                    if (event.pointerType === "touch") return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDay(
                      Math.max(
                        1,
                        Math.min(
                          days.length,
                          Math.floor(
                            ((event.clientX - rect.left) / rect.width) *
                              days.length,
                          ) + 1,
                        ),
                      ),
                    );
                  }}
                >
                  {ticks.map((tick) => (
                    <line
                      key={tick}
                      x1={0}
                      y1={y(tick)}
                      x2={WIDTH}
                      y2={y(tick)}
                      stroke="var(--border)"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {running && budget > 0 ? (
                    <line
                      x1={0}
                      y1={y(budget)}
                      x2={WIDTH}
                      y2={y(budget)}
                      stroke="var(--foreground)"
                      strokeDasharray="6 5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {running ? (
                    <polyline
                      points={days
                        .map(
                          (entry, index) =>
                            `${x(index)},${y(entry.cumulative)}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : (
                    days.map((entry, index) => (
                      <rect
                        key={entry.date}
                        x={x(index) - (WIDTH / days.length) * 0.32}
                        y={y(entry.amount)}
                        width={(WIDTH / days.length) * 0.64}
                        height={HEIGHT - y(entry.amount)}
                        fill="var(--primary)"
                        opacity={entry.day === selected.day ? 1 : 0.55}
                      />
                    ))
                  )}
                  <line
                    x1={x(selected.day - 1)}
                    y1={0}
                    x2={x(selected.day - 1)}
                    y2={HEIGHT}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div
                  aria-hidden="true"
                  className="relative mt-2 h-5 text-xs tabular-nums text-muted-foreground"
                >
                  {labels.map((entry) => (
                    <span
                      key={entry.day}
                      className="absolute -translate-x-1/2"
                      style={{
                        left: `${((entry.day - 0.5) / days.length) * 100}%`,
                      }}
                    >
                      {entry.day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
              <label htmlFor={`${id}-day`} className="text-sm">
                Inspect day
              </label>
              <input
                id={`${id}-day`}
                type="range"
                min={1}
                max={days.length}
                step={1}
                value={selected.day}
                onChange={(event) => setDay(Number(event.target.value))}
                aria-valuetext={`${selected.date}: ${money(selected.amount)} spent, ${money(selected.cumulative)} running total`}
                className="h-11 w-full accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>
            <p
              id={`${id}-summary`}
              className="mt-2 text-xs text-muted-foreground"
            >
              Month total: {money(total)}
              {budget > 0
                ? ` · Monthly budget: ${money(budget)}`
                : " · No monthly budget set"}
              . Use the slider to inspect each day.
            </p>
            <details className="mt-4 border-t pt-3">
              <summary className="cursor-pointer text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                View daily amounts
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">
                    Daily spending and running totals for {month}, in AED
                  </caption>
                  <thead>
                    <tr className="border-b">
                      <th scope="col" className="py-2 text-left font-medium">
                        Date
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Daily spending
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Running total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((entry) => (
                      <tr key={entry.date} className="border-b last:border-0">
                        <th scope="row" className="py-2 text-left font-normal">
                          {entry.date}
                        </th>
                        <td className="py-2 text-right">
                          {money(entry.amount)}
                        </td>
                        <td className="py-2 text-right">
                          {money(entry.cumulative)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
