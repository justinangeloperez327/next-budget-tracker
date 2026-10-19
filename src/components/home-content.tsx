"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChartNoAxesCombined,
  Landmark,
  ListFilter,
  Send,
  Target,
} from "lucide-react";
import { ThemeStamp, ThemeCompanion } from "@/components/character-theme";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  return (
    <>
      <NotebookHero className="my-8">
        <div className="grid items-center gap-10 px-6 py-12 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="mb-5">
              <ThemeStamp />
            </div>
            <h1 className="max-w-xl text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">
              Make room for
              <br />
              <span className="text-primary">what matters.</span>
            </h1>
            <p className="mt-6 max-w-md leading-7 text-muted-foreground">
              Plan in AED, keep Philippine commitments in view, and understand
              where your money is going without mixing currencies or duplicating
              transactions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Start tracking <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <ThemeCompanion className="w-16" />
              <p className="text-xs leading-5 text-muted-foreground">
                Small steps, a calmer month.
                <br />
                Your account keeps your financial workspace in sync.
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border bg-card p-6 shadow-[0_12px_48px_-24px_rgba(24,24,27,0.16)] sm:p-8">
            <p className="eyebrow">One financial workspace</p>
            <h2 className="mt-3 text-xl font-medium tracking-tight">
              Built for everyday life between the UAE and Philippines.
            </h2>
            <div className="mt-6 divide-y border-y">
              {[
                {
                  icon: Target,
                  title: "Plan and spend",
                  description:
                    "Budget vs. actual, expenses, recurring bills, and debt in AED.",
                },
                {
                  icon: Send,
                  title: "Send and save",
                  description:
                    "Track remittances, transfer fees, savings goals, and own-account transfers.",
                },
                {
                  icon: Landmark,
                  title: "Philippine commitments",
                  description:
                    "Keep SSS, PhilHealth, Pag-IBIG, and MP2 records in PHP.",
                },
                {
                  icon: BellRing,
                  title: "Stay ahead",
                  description:
                    "Use reminders, financial reports, and history to spot what needs attention.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <div className="flex gap-3 py-4" key={title}>
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              New accounts start empty. Your workspace only shows the financial
              records you enter.
            </p>
          </div>
        </div>
      </NotebookHero>

      <FeatureCards
        className="!bg-transparent !px-0"
        eyebrow="A simpler financial habit"
        heading="Everything you need to stay on track."
        items={[
          {
            icon: ListFilter,
            title: "Capture the everyday",
            description:
              "Record expenses and linked payments without double counting.",
            color: "var(--primary)",
          },
          {
            icon: Target,
            title: "Keep plans measurable",
            description:
              "Compare monthly budgets, category limits, savings goals, bills, and debt.",
            color: "var(--primary)",
          },
          {
            icon: ChartNoAxesCombined,
            title: "See the bigger picture",
            description:
              "Review AED and PHP activity separately through reports and financial history.",
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
            Set a budget, record what matters, and let the reports build from
            your real data.
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

function NotebookHero({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border notebook-paper ${className}`}
    >
      {children}
    </section>
  );
}
function FeatureCards({
  items,
  eyebrow,
  heading,
}: {
  className?: string;
  eyebrow: string;
  heading: string;
  items: {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
  }[];
}) {
  return (
    <section className="py-8">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-medium">{heading}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, description }) => (
          <div className="notebook-note rounded-lg border p-5" key={title}>
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-sm font-medium">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
