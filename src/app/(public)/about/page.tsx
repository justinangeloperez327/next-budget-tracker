import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <section className="mx-auto max-w-2xl py-16">
      <p className="eyebrow">About Budget Tracker</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">
        A clearer view of everyday finances.
      </h1>
      <p className="mt-6 leading-7 text-muted-foreground">
        Budget Tracker brings monthly spending, recurring obligations, savings,
        debt, remittances, and Philippine financial commitments into one
        personal workspace.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Your records, kept together
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            When you log in, your financial records are saved to your account
            and available across devices. AED household finances and PHP
            contribution or MP2 records remain separate so reports do not create
            misleading mixed-currency totals.
          </p>
          <p>
            New accounts start empty. The app does not insert sample
            transactions into your workspace.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
