"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  ListFilter,
  Target,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import ShapeHero from "@/components/kokonutui/shape-hero";
import SpotlightCards from "@/components/kokonutui/spotlight-cards";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  return (
    <>
      <ShapeHero className="my-8">
        <div className="grid items-center gap-10 px-6 py-12 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="eyebrow mb-5">Less guesswork. More clarity.</p>
            <h1 className="max-w-xl text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">
              Make room for
              <br />
              <span className="text-primary">what matters.</span>
            </h1>
            <p className="mt-6 max-w-md leading-7 text-muted-foreground">
              Know where your money goes. Track the everyday, build a monthly
              plan, and make your next decision with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Start tracking <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">
                  Explore demo <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Try the demo without an account.
            </p>
          </div>
          <div className="min-w-0 rounded-xl border bg-white p-6 shadow-[0_12px_48px_-24px_rgba(79,70,229,0.3)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                Your month, at a glance
              </span>
              <Wallet className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Illustrative budget · AED
            </p>
            <p className="mt-8 text-sm text-muted-foreground">
              Available to spend
            </p>
            <p className="mt-2 text-4xl font-medium tabular-nums tracking-tight">
              2,850<span className="text-2xl text-muted-foreground">.00</span>
            </p>
            <div className="mt-6 flex justify-between text-xs text-muted-foreground">
              <span>43% of budget used</span>
              <span>AED 5,000 budget</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[43%] rounded-full bg-primary" />
            </div>
            <div className="mt-6 divide-y border-t text-sm">
              {[
                ["Groceries", "AED 850", "bg-indigo-50"],
                ["Transport", "AED 300", "bg-teal-50"],
                ["Other expenses", "AED 1,000", "bg-amber-50"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`size-3 rounded-sm ${color}`}
                    />
                    {label}
                  </span>
                  <span className="tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ShapeHero>
      <SpotlightCards
        className="!bg-transparent !px-0"
        eyebrow="A simpler spending habit"
        heading="Everything you need to stay on track."
        items={[
          {
            icon: ListFilter,
            title: "Capture the everyday",
            description:
              "Add expenses, organise categories, and find transactions quickly.",
            color: "#4f46e5",
          },
          {
            icon: Target,
            title: "Give spending a limit",
            description:
              "Set a monthly budget and keep your remaining balance in view.",
            color: "#0f766e",
          },
          {
            icon: ChartNoAxesCombined,
            title: "See the bigger picture",
            description:
              "Review spending by category and export a CSV backup whenever you need.",
            color: "#9a6410",
          },
        ]}
      />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t py-8">
        <div>
          <h2 className="text-xl font-medium tracking-tight">
            Your next month starts with one small step.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set a budget. Add an expense. See the difference.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Open your workspace <ArrowRight />
          </Link>
        </Button>
      </div>
    </>
  );
}
