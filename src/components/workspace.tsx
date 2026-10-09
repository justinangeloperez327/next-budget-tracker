"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  BellRing,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  CircleAlert,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PiggyBank,
  Receipt,
  Send,
  Target,
} from "lucide-react";
import { ThemeControls } from "@/components/theme-controls";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/components/budget-provider";

const navigation = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/financial", "Financial overview", BadgeDollarSign],
  ["/reminders", "Reminders", BellRing],
  ["/budget", "Budget vs. actual", Target],
  ["/expenses", "Expense tracker", Receipt],
  ["/bills", "Bills & recurring", CalendarDays],
  ["/debts", "Debt / Utang", HandCoins],
  ["/savings", "Savings goals", PiggyBank],
  ["/remittances", "Remittances", Send],
  ["/contributions", "Contributions", Landmark],
  ["/reports", "Reports", ChartNoAxesColumnIncreasing],
] as const;

function sectionForPath(pathname: string) {
  if (pathname === "/expenses") return "Expenses";
  if (pathname.startsWith("/bills")) return "Bills";
  if (pathname.startsWith("/debts")) return "Debt";
  if (pathname.startsWith("/savings")) return "Savings";
  if (pathname.startsWith("/remittances")) return "Remittances";
  if (pathname.startsWith("/financial")) return "Financial";
  if (pathname.startsWith("/reminders")) return "Reminders";
  if (pathname === "/budget") return "Budget";
  if (pathname.startsWith("/reports")) return "Reports";
  if (
    pathname.startsWith("/contributions") ||
    pathname.startsWith("/sss") ||
    pathname.startsWith("/philhealth") ||
    pathname.startsWith("/pagibig") ||
    pathname.startsWith("/mp2")
  )
    return "Contributions";
  return "Overview";
}

function activeRoute(pathname: string, href: string) {
  if (href === "/financial") return pathname.startsWith("/financial");
  if (href === "/reminders") return pathname.startsWith("/reminders");
  if (href === "/reports") return pathname.startsWith("/reports");
  if (href === "/bills") return pathname.startsWith("/bills");
  if (href === "/debts") return pathname.startsWith("/debts");
  if (href === "/savings") return pathname.startsWith("/savings");
  if (href === "/remittances") return pathname.startsWith("/remittances");
  if (href === "/contributions")
    return (
      pathname.startsWith("/contributions") ||
      pathname.startsWith("/sss") ||
      pathname.startsWith("/philhealth") ||
      pathname.startsWith("/pagibig") ||
      pathname.startsWith("/mp2")
    );
  return pathname === href;
}

export function Workspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, loaded, email, error, saveError, saving, logout } =
    useBudget();
  const section = sectionForPath(pathname);
  const saveLabel = error
    ? loaded
      ? "Save issue"
      : "Workspace unavailable"
    : saveError
      ? "Action failed"
      : saving
        ? "Saving…"
        : ready
          ? "All changes saved"
          : "Loading…";
  const SaveStatusIcon =
    error || saveError ? CircleAlert : saving ? LoaderCircle : CheckCircle2;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#workspace-main"
        className="sr-only z-50 rounded-md bg-card px-4 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside className="border-b bg-card md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-hidden md:border-r md:border-b-0">
        <div className="p-4 pb-3 md:p-5 md:pb-3">
          <Brand />
          <p className="eyebrow mt-6 hidden md:block">Workspace</p>
        </div>

        <nav
          aria-label="Workspace navigation"
          className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-4 md:min-h-0 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pb-3"
        >
          {navigation.map(([href, label, Icon]) => {
            const active = activeRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors md:shrink ${
                  active
                    ? "bg-muted font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t p-4 md:block">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-primary">
              {email?.[0]?.toUpperCase() || "A"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {email ? "Signed in" : "Account"}
              </p>
              <p
                className="mt-0.5 truncate text-xs text-muted-foreground"
                title={email ?? undefined}
              >
                {email || (ready ? "Account unavailable" : "Loading account…")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full"
            disabled={saving}
            onClick={logout}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b bg-card/95 px-4 py-2 backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              Workspace / {section}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-2 text-xs sm:flex ${
                error || saveError
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
              role={saving ? "status" : undefined}
            >
              <SaveStatusIcon
                className={`size-3.5 ${saving ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {saveLabel}
            </span>
            <ThemeControls />
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="md:hidden"
              disabled={saving}
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main
          id="workspace-main"
          className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
        >
          {error || saveError ? (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
            >
              <span>{error || saveError}</span>
              {error ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Reload workspace
                </Button>
              ) : null}
            </div>
          ) : null}

          {loaded ? (
            children
          ) : ready ? (
            <p className="text-sm text-muted-foreground">
              Your workspace is unavailable. Reload to try again.
            </p>
          ) : (
            <div role="status" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Loading workspace…
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    aria-hidden="true"
                    className="h-28 rounded-lg bg-muted motion-safe:animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
