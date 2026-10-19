"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeMark } from "@/components/character-theme";
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
        <ThemeMark />
      </span>
      Budget Tracker
    </Link>
  );
}

export function SiteHeader({ account }: { account: PublicAccount | null }) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const busy = useRef(false);

  async function signOut() {
    if (busy.current) return;
    busy.current = true;
    setSignOutError("");
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      window.location.replace("/login");
    } catch {
      setSignOutError("Sign out failed. Please try again.");
    } finally {
      busy.current = false;
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:flex-wrap sm:px-6">
        <Brand />
        {signOutError ? (
          <p
            role="alert"
            className="order-last col-span-2 w-full text-sm text-destructive"
          >
            {signOutError}
          </p>
        ) : null}
        <nav
          aria-label="Main navigation"
          className="col-span-2 row-start-2 flex flex-wrap items-center justify-between gap-1 text-sm sm:order-2 sm:ml-auto sm:w-auto sm:justify-start"
        >
          {[
            ["/about", "About"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`shrink-0 rounded-md px-3 py-2.5 transition-colors hover:bg-muted ${pathname === href ? "text-primary" : "text-muted-foreground"}`}
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
                className={`shrink-0 rounded-md px-3 py-2.5 transition-colors hover:bg-muted ${pathname === "/login" ? "text-primary" : "text-muted-foreground"}`}
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
        </nav>
        <div className="col-start-2 row-start-1 sm:order-3">
          <ThemeControls />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ authenticated }: { authenticated: boolean }) {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
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
