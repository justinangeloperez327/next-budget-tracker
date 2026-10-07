"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyData, validData, type BudgetData } from "@/lib/budget";
type Context = {
  data: BudgetData;
  ready: boolean;
  email: string | null;
  error: string;
  saving: boolean;
  save: (data: BudgetData) => Promise<boolean>;
  logout: () => Promise<void>;
};
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<BudgetData>(emptyData);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/workspace", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error || "Your notebook could not be loaded.");
        if (controller.signal.aborted) return;
        if (!result.user?.email || !validData(result.data))
          throw Error("Saved data could not be read. Reload to try again.");
        revision.current = result.revision;
        setEmail(result.user.email);
        setData(result.data);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load your notebook. Reload to try again.",
        );
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  async function save(next: BudgetData) {
    if (!ready || error || busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next, revision: revision.current }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error || "Changes could not be saved. Reload to try again.",
        );
      revision.current = result.revision;
      setData(next);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Changes could not be saved. Reload before trying again.",
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw Error("Sign out failed. Please try again.");
      setData(emptyData);
      setEmail(null);
      router.push("/login");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <BudgetContext.Provider
      value={{ data, ready, email, error, saving, save, logout }}
    >
      {children}
    </BudgetContext.Provider>
  );
}
export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw Error("BudgetProvider required");
  return context;
}
