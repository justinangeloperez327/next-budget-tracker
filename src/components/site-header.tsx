"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 font-medium tracking-tight"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
        <Wallet size={17} aria-hidden="true" />
      </span>
      Budget Tracker
    </Link>
  );
}
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-1 text-sm"
        >
          {[
            ["/about", "About"],
            ["/contact", "Contact"],
            ["/login", "Log in"],
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
          <Button asChild>
            <Link href="/register">
              Get started <ArrowUpRight />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
        <span>Budget Tracker · Make room for what matters.</span>
        <Link className="hover:text-primary" href="/dashboard">
          Explore the demo ↗
        </Link>
      </div>
    </footer>
  );
}
