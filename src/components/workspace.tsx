"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, LogOut } from "lucide-react";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/components/budget-provider";
export function Workspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, email, error, logout } = useBudget();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-muted/20 p-6 md:border-r md:border-b-0">
        <Brand />
        <nav
          aria-label="Workspace navigation"
          className="mt-8 flex gap-2 md:flex-col"
        >
          {(
            [
              ["/dashboard", "Dashboard", LayoutDashboard],
              ["/expenses", "Expense tracker", Receipt],
            ] as const
          ).map(([href, label, Icon]) => (
            <Link
              key={String(href)}
              href={String(href)}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname === href ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon size={17} />
              {String(label)}
            </Link>
          ))}
        </nav>
        <div className="mt-8 space-y-3 text-sm text-muted-foreground">
          <p className="break-all">{email || "Demo workspace"}</p>
          {email ? (
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut size={15} />
              Sign out
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
          <p className="text-xs leading-5">
            Data is saved on this device. Export expenses to keep a backup.
          </p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl p-6 md:p-10">
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-destructive p-4 text-sm"
          >
            {error}
          </p>
        )}
        {ready ? (
          children
        ) : (
          <p role="status" className="text-muted-foreground">
            Loading workspace…
          </p>
        )}
      </main>
    </div>
  );
}
