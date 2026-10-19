"use client";
import { ThemeCompanion, ThemeStamp } from "@/components/character-theme";
import { Eye, EyeOff } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
export function AuthForm({ register = false }: { register?: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")),
      password = String(data.get("password"));
    if (register && password !== String(data.get("confirm-password"))) {
      setMessage("Passwords do not match.");
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      const response = await fetch(
        `/api/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: String(data.get("name") || ""),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Account access failed. Try again.");
      // Session cookies changed outside a Server Action; discard cached layouts.
      window.location.replace("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <section className="mx-auto grid max-w-4xl gap-8 py-10 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
      <aside className="hidden pt-8 lg:block">
        <ThemeStamp />
        <h2 className="mt-4 max-w-sm text-3xl font-medium leading-tight sm:text-4xl">
          A little clarity.
          <br />
          More room to plan.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
          Keep everyday spending, savings and commitments together. Review each
          currency on its own terms.
        </p>
        <div className="mt-6 flex flex-wrap gap-5 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            <span className="currency-label mr-2">AED</span>Everyday spending
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="currency-label mr-2">PHP</span>Philippine
            commitments
          </p>
        </div>
      </aside>
      <Card>
        <CardHeader>
          <ThemeCompanion className="mx-auto mb-3 w-20" />
          <h1 className="text-2xl font-medium">
            {register ? "Create your account" : "Welcome back"}
          </h1>
          <CardDescription>
            {register
              ? "Start building a clearer spending habit."
              : "Log in to your budget workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <fieldset disabled={pending} className="min-w-0 space-y-5">
              {register && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={256}
                  required
                />
              </div>
              {register && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                  />
                </div>
              )}
              <p
                role="alert"
                aria-label="Account access error"
                className="min-h-5 text-sm text-destructive"
              >
                {message}
              </p>
              <Button className="w-full" disabled={pending}>
                {pending
                  ? "Please wait…"
                  : register
                    ? "Create account"
                    : "Log in"}
              </Button>
            </fieldset>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {register ? "Already have an account?" : "New here?"}{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={register ? "/login" : "/register"}
            >
              {register ? "Log in" : "Create account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
