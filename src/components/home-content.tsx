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
import { SakuraStamp, SakuraCat } from "@/components/sakura-companion";
import ShapeHero from "@/components/kokonutui/shape-hero";
import SpotlightCards from "@/components/kokonutui/spotlight-cards";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  return (
    <>
      <ShapeHero className="my-8">
        <div className="grid items-center gap-10 px-6 py-12 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="mb-5">
              <SakuraStamp />
            </div>
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
            <div className="mt-6 flex items-center gap-3">
              <SakuraCat className="w-16" />
              <p className="text-xs leading-5 text-muted-foreground">
                Small steps, a calmer month.
                <br />
                Try the demo without an account.
              </p>
            </div>
          </div>
          <div className="min-w-0 rounded-xl border bg-card p-6 shadow-[0_12px_48px_-24px_rgba(24,24,27,0.16)] sm:p-8">
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
                ["Groceries", "AED 850", "bg-muted"],
                ["Transport", "AED 300", "bg-primary/20"],
                ["Other expenses", "AED 1,000", "bg-primary/35"],
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
            color: "var(--primary)",
          },
          {
            icon: Target,
            title: "Give spending a limit",
            description:
              "Set a monthly budget and keep your remaining balance in view.",
            color: "var(--primary)",
          },
          {
            icon: ChartNoAxesCombined,
            title: "See the bigger picture",
            description:
              "Review spending by category and export a CSV backup whenever you need.",
            color: "var(--primary)",
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
