"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-medium">This page is unavailable</h1>
      <p role="alert" className="mt-3 text-sm text-muted-foreground">
        We couldn’t load this page. Please try again shortly.
      </p>
      <Button className="mt-6" onClick={retry}>
        Try again
      </Button>
    </main>
  );
}
