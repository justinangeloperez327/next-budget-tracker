import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-medium">
      <Wallet size={20} aria-hidden="true" />
      Budget Tracker
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-4 text-sm"
        >
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Log in</Link>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
        <span>Budget Tracker · Make room for what matters.</span>
        <Link href="/dashboard">Explore the demo</Link>
      </div>
    </footer>
  );
}
