"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Flower2, ArrowUpRight, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeControls } from "@/components/theme-controls";
import { Button } from "@/components/ui/button";

type PublicAccount = {
  name: string;
  email: string;
};

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 font-medium tracking-tight"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Flower2 size={17} aria-hidden="true" />
      </span>
      Budget Tracker
    </Link>
  );
}

export function SiteHeader({ account }: { account: PublicAccount | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-1 text-sm"
        >
          {[
            ["/about", "About"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`rounded-md px-3 py-3 transition-colors hover:bg-muted ${pathname === href ? "text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </Link>
          ))}

          {account ? (
            <>
              <span
                className="hidden max-w-48 truncate px-3 text-muted-foreground md:inline"
                title={account.email}
              >
                {account.name || account.email}
              </span>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="ghost"
                disabled={signingOut}
                onClick={signOut}
                type="button"
              >
                <LogOut />
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                className={`rounded-md px-3 py-3 transition-colors hover:bg-muted ${pathname === "/login" ? "text-primary" : "text-muted-foreground"}`}
              >
                Log in
              </Link>
              <Button asChild>
                <Link href="/register">
                  Get started <ArrowUpRight />
                </Link>
              </Button>
            </>
          )}

          <ThemeControls />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ authenticated }: { authenticated: boolean }) {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
        <span>Budget Tracker · Make room for what matters.</span>
        <Link
          className="hover:text-primary"
          href={authenticated ? "/dashboard" : "/register"}
        >
          {authenticated ? "Open your workspace ↗" : "Create your account ↗"}
        </Link>
      </div>
    </footer>
  );
}
