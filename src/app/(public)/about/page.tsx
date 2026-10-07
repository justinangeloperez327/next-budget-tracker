import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function About() {
  return (
    <section className="mx-auto max-w-2xl py-16">
      <p className="eyebrow">About Budget Tracker</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">
        A little clarity, every day.
      </h1>
      <p className="mt-6 leading-7 text-muted-foreground">
        Budget Tracker helps you build a simple habit: record what you spend and
        review it against a monthly plan. Clear totals and practical categories
        keep your attention on the decisions that matter.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Your data stays in your browser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Expenses and budgets are currently stored on this device. They are
            not synced to a server. Export a CSV backup before clearing your
            browser data.
          </p>
          <p>
            The demo is available without an account. Account access uses
            Supabase when configured by the application owner.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
