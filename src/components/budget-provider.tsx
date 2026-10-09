"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyData, validData, type BudgetData } from "@/lib/budget";
import { validWorkspace } from "@/lib/workspace-validation";
type Context = {
  data: BudgetData;
  ready: boolean;
  loaded: boolean;
  saveError: string;
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
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState("");
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
          throw Error(result.error || "Your workspace could not be loaded.");
        if (controller.signal.aborted) return;
        if (
          typeof result.user?.email !== "string" ||
          !Number.isSafeInteger(result.revision) ||
          result.revision < 0 ||
          !validData(result.data)
        )
          throw Error("Saved data could not be read. Reload to try again.");
        revision.current = result.revision;
        setEmail(result.user.email);
        setData(result.data);
        setLoaded(true);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load your workspace. Reload to try again.",
        );
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  async function save(next: BudgetData) {
    if (!loaded || error || busy.current) return false;
    setSaveError("");
    if (!validWorkspace(next)) {
      setSaveError(
        "Changes were not saved. Check record limits, dates, amounts, and linked payments, then try again.",
      );
      return false;
    }
    busy.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next, revision: revision.current }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message =
          result.error || "Changes could not be saved. Reload to try again.";
        if ([400, 413, 415, 429].includes(response.status)) {
          setSaveError(message);
          return false;
        }
        throw Error(message);
      }
      if (result.revision !== revision.current + 1)
        throw Error(
          "The save could not be confirmed. Reload before editing again.",
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
      setLoaded(false);
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Unable to sign out.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <BudgetContext.Provider
      value={{
        data,
        ready,
        loaded,
        email,
        error,
        saveError,
        saving,
        save,
        logout,
      }}
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
