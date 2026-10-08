"use client";

import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { useBudget } from "@/components/budget-provider";
import {
  contributionSummary,
  governmentProviderDefinitions,
  governmentProviders,
  phpMoney,
} from "@/lib/government";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GovernmentContributions() {
  const { data } = useBudget();
  const year = new Date().getFullYear();
  const accounts = data.governmentAccounts ?? [];
  const contributions = data.governmentContributions ?? [];

  const providers = governmentProviders.map((provider) => {
    const definition = governmentProviderDefinitions[provider];
    const account = accounts.find((entry) => entry.provider === provider);
    const summary = contributionSummary(account, contributions, year);
    return { definition, account, summary };
  });

  const configured = providers.filter(({ account }) => !!account);
  const totalPaid = configured.reduce(
    (sum, { summary }) => sum + summary.totalPaid,
    0,
  );
  const attention = configured.reduce(
    (sum, { summary }) =>
      sum + summary.pendingMonths + summary.missedMonths,
    0,
  );

  return (
    <>
      <div>
        <p className="eyebrow">Government contributions</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Contribution accounts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Keep SSS, PhilHealth, and Pag-IBIG contribution records under one
          account-based structure while each provider keeps its own membership
          profile and history.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Configured accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {configured.length} / {governmentProviders.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid in {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tabular-nums">
              {phpMoney(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                attention
                  ? "text-2xl font-medium tabular-nums text-destructive"
                  : "text-2xl font-medium tabular-nums"
              }
            >
              {attention}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pending or explicitly missed records
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {providers.map(({ definition, account, summary }) => (
          <Card key={definition.provider}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-medium">
                    {definition.shortLabel}
                  </CardTitle>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {definition.label}
                  </p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <Landmark size={17} />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Profile</p>
                  <p className="mt-1 font-medium">
                    {account
                      ? account.active
                        ? "Active"
                        : "Inactive"
                      : "Not configured"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frequency</p>
                  <p className="mt-1 font-medium">
                    {account?.frequency ?? definition.defaultFrequency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Paid in {year}
                  </p>
                  <p className="mt-1 font-medium tabular-nums">
                    {phpMoney(summary.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Paid records
                  </p>
                  <p className="mt-1 font-medium tabular-nums">
                    {summary.paidMonths}
                  </p>
                </div>
              </div>

              {definition.trackerPath ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={definition.trackerPath}>
                    Open {definition.shortLabel}
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  Account setup will be available here.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="py-5">
          <p className="text-sm font-medium">Shared contribution rules</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            All three providers use the same contribution record format:
            contribution period, amount, payment date, status, reference number,
            and notes. Provider-specific official contribution calculations are
            kept separate from this shared record layer.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
