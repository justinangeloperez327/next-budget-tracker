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
              <SakuraCat className="w-16" />
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
      </ShapeHero>

      <SpotlightCards
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
