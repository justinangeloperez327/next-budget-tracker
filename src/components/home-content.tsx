import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  BellRing,
  ChartNoAxesCombined,
  Landmark,
  Receipt,
  Send,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  return (
    <>
      <section className="grid gap-10 border-b py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="eyebrow">For life between the UAE and Philippines</p>
          <h1 className="mt-5 max-w-xl text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            Two currencies.
            <br />
            One clearer month.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            Plan your everyday spending in AED. Keep remittances, savings and
            Philippine commitments in view, with each currency in its own place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/register">
                Create your account <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Start with your own records. Build a plan that fits your month.
          </p>
        </div>
        <div className="border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <p className="text-sm font-medium">Your financial workspace</p>
            <ArrowLeftRight
              className="size-4 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-5 sm:p-6">
              <span className="currency-label">AED</span>
              <h2 className="mt-5 text-xl font-medium">Everyday in the UAE</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Monthly budgets, expenses, bills and debt.
              </p>
              <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
                Plan · Record · Review
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <span className="currency-label">PHP</span>
              <h2 className="mt-5 text-xl font-medium">
                Commitments back home
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                SSS, PhilHealth, Pag-IBIG and MP2.
              </p>
              <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
                Track · Save · Stay on time
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t bg-muted/40 px-5 py-4">
            <Send
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Connect the two with remittance records: AED sent, PHP received
              and the fees along the way.
            </p>
          </div>
        </div>
      </section>
      <section className="py-10 sm:py-14" aria-labelledby="home-features">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">A useful monthly routine</p>
            <h2 id="home-features" className="mt-2 text-2xl font-medium">
              Know what came in, went out, and needs attention.
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-0 border-y sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Target,
              title: "Set your plan",
              text: "Give the month a budget and compare spending by category.",
            },
            {
              icon: Receipt,
              title: "Keep a clear record",
              text: "Track expenses and linked payments without counting them twice.",
            },
            {
              icon: Landmark,
              title: "Keep commitments in view",
              text: "Review bills, contributions, savings goals and debt together.",
            },
            {
              icon: ChartNoAxesCombined,
              title: "See your progress",
              text: "Use spending graphs and reports to understand each month.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="border-b px-0 py-6 last:border-b-0 sm:px-4 lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0"
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <BellRing className="size-4 shrink-0" aria-hidden="true" />
          In-app reminders help you spot what needs attention next.
        </div>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-5 border-t py-8">
        <div>
          <h2 className="text-xl font-medium">
            Make your next month easier to read.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your records, your plan, and a clearer view of what remains.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Open your workspace <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </>
  );
}
