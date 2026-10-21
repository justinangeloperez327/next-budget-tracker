"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { emptyData, validData, type BudgetData } from "@/lib/budget";
import { validWorkspace } from "@/lib/workspace-validation";
import { interpretSaveResponse } from "@/lib/save-response";
type Context = {
  data: BudgetData;
  ready: boolean;
  loaded: boolean;
  saveError: string;
  reloadRequired: boolean;
  email: string | null;
  error: string;
  saving: boolean;
  save: (data: BudgetData) => Promise<boolean>;
  logout: () => Promise<void>;
};
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BudgetData>(emptyData);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false);
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
        const result = await response.json().catch(() => null);
        if (!response.ok)
          throw Error(
            typeof result?.error === "string"
              ? result.error
              : "Your workspace could not be loaded. Reload to try again.",
          );
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
    if (!loaded || error || reloadRequired || busy.current) return false;
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
      const result: unknown = await response.json().catch(() => null);
      const outcome = interpretSaveResponse(response.status, result, revision.current);
      if (outcome.kind === "rejected") {
        setSaveError(outcome.message);
        setReloadRequired(outcome.reloadRequired);
        return false;
      }
      revision.current = outcome.revision;
      setData(next);
      setReloadRequired(false);
      return true;
    } catch {
      // The server may have committed even if the response was lost.
      // Never increment the revision here: a subsequent retry will receive
      // 409 if that earlier write succeeded, protecting newer data.
      setSaveError(
        "The save could not be confirmed. Retry the edit; if it already saved, you will be asked to reload instead of overwriting data.",
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
      window.location.replace("/login");
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
        reloadRequired,
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
