"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")),
      password = String(data.get("password"));
    try {
      const result = register
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: String(data.get("name")) } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) router.push("/dashboard");
      else setMessage("Check your email to confirm your account, then log in.");
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
      <p className="eyebrow mb-5 text-center">Your money. A clearer picture.</p>
      <Card className="shadow-[0_8px_32px_-20px_rgba(79,70,229,0.2)]">
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
                required
              />
            </div>
            {!supabase && (
              <p className="text-sm text-muted-foreground">
                Account access is not configured yet. You can explore the demo
                below.
              </p>
            )}
            <p role="status" className="text-sm">
              {message}
            </p>
            <Button className="w-full" disabled={pending || !supabase}>
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
