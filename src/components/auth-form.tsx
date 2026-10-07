"use client";
import { SakuraCat } from "@/components/sakura-companion";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
export function AuthForm({
  register = false,
  configured = false,
}: {
  register?: boolean;
  configured?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")),
      password = String(data.get("password"));
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
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mx-auto max-w-md py-12 sm:py-16">
      <SakuraCat className="mx-auto mb-3 w-20" />
      <p className="eyebrow mb-5 text-center">Your money. A clearer picture.</p>
      <Card className="shadow-[0_8px_32px_-20px_rgba(24,24,27,0.12)]">
        <CardHeader>
          <CardTitle className="text-2xl font-medium">
            {register ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {register
              ? "Start building a clearer spending habit."
              : "Log in to your budget workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={8}
                maxLength={256}
                required
              />
            </div>
            {!configured && (
              <p className="text-sm text-muted-foreground">
                Account sign-in is temporarily unavailable. You can still explore
                the demo below.
              </p>
            )}
            <p role="status" className="text-sm">
              {message}
            </p>
            <Button className="w-full" disabled={pending || !configured}>
              {pending
                ? "Please wait…"
                : register
                  ? "Create account"
                  : "Log in"}
            </Button>
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
          <Button variant="outline" className="mt-5 w-full" asChild>
            <Link href="/dashboard">Explore demo</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
