import Link from "next/link";
import {
  ArrowRight,
  ListFilter,
  ChartNoAxesCombined,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Home() {
  return (
    <>
      <section className="grid items-center gap-12 py-20 md:grid-cols-2">
        <div>
          <p className="mb-5 text-sm text-muted-foreground">
            Small habits. A clearer picture.
          </p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            Know where your money goes.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-muted-foreground">
            Keep everyday expenses in one place, set a monthly budget, and spend
            with a little more confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">
                Create an account <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Explore demo</Link>
            </Button>
          </div>
        </div>
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Your month, at a glance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              An example of a balanced budget
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly budget</span>
              <span>AED 5,000.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spent so far</span>
              <span>AED 2,150.00</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 w-[43%] rounded-full bg-primary" />
            </div>
            <div className="flex justify-between text-sm">
              <span>43% used</span>
              <span>AED 2,850 left</span>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-5 md:grid-cols-3">
        {(
          [
            [
              ListFilter,
              "Capture the everyday",
              "Add expenses, organise categories, and find transactions quickly.",
            ],
            [
              Target,
              "Give spending a limit",
              "Set a monthly budget and see how much you have left.",
            ],
            [
              ChartNoAxesCombined,
              "See the bigger picture",
              "Understand your spending by category without the clutter.",
            ],
          ] as const
        ).map(([Icon, title, description]) => (
          <Card key={String(title)}>
            <CardHeader>
              <Icon size={22} className="mb-3" />
              <CardTitle className="text-base font-medium">
                {String(title)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {String(description)}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
