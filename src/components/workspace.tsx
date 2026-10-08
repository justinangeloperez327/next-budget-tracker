"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  LogOut,
  HardDrive,
  Target,
} from "lucide-react";
import { ThemeControls } from "@/components/theme-controls";
import { SakuraCat } from "@/components/sakura-companion";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/components/budget-provider";

export function Workspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, email, error, saving, logout } = useBudget();
  const section =
    pathname === "/expenses"
      ? "Expenses"
      : pathname === "/budget"
        ? "Budget"
        : "Overview";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b bg-card p-5 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <Brand />
        <div className="notebook-note mt-6 hidden items-center gap-3 rounded-lg border p-3 md:flex">
          <SakuraCat className="w-12" />
          <p className="text-xs leading-5 text-muted-foreground">
            A little care for
            <br />
            your everyday spending.
          </p>
        </div>
        <p className="eyebrow mt-6 hidden md:block">Workspace</p>
        <nav
          aria-label="Workspace navigation"
          className="mt-4 flex flex-wrap gap-2 md:flex-col"
        >
          {(
            [
              ["/dashboard", "Dashboard", LayoutDashboard],
              ["/budget", "Budget vs. actual", Target],
              ["/expenses", "Expense tracker", Receipt],
            ] as const
          ).map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                pathname === href
                  ? "bg-muted font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground md:hidden">
          <span>Your account · Synced</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
        <div className="mt-6 hidden space-y-4 border-t pt-5 text-sm md:mt-auto md:block">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-medium text-primary">
              {email?.[0]?.toUpperCase() || "A"}
            </span>
            <div className="min-w-0">
              <p className="font-medium">Your account</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {email || "Loading account…"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={saving}
            onClick={logout}
          >
            <LogOut size={15} />
            Sign out
          </Button>
          <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
            <HardDrive className="mt-0.5 size-4 shrink-0" />
            Saved securely to your account. Available when you log in on another
            device.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4 text-xs text-muted-foreground">
          <span>Workspace / {section}</span>
          <div className="flex items-center gap-3">
            <ThemeControls />
            <span className="hidden items-center gap-2 sm:flex">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary"
              />
              AED · Synced
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:p-10">
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-md border border-destructive p-4 text-sm"
            >
              {error}{" "}
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => window.location.reload()}
              >
                Reload notebook
              </button>
            </p>
          )}
          {saving && (
            <p role="status" className="mb-4 text-xs text-muted-foreground">
              Saving changes…
            </p>
          )}
          {ready ? (
            children
          ) : (
            <div role="status" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Loading workspace…
              </p>
              <div
                aria-hidden="true"
                className="h-36 rounded-xl bg-muted motion-safe:animate-pulse"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
