"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { emptyData, validData, type BudgetData } from "@/lib/budget";
type Context = {
  data: BudgetData;
  ready: boolean;
  email: string | null;
  error: string;
  save: (d: BudgetData) => boolean;
  logout: () => Promise<void>;
};
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<BudgetData>(emptyData),
    [ready, setReady] = useState(false),
    [email, setEmail] = useState<string | null>(null),
    [key, setKey] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    function load(id?: string, email?: string) {
      if (!active) return;
      setReady(false);
      const key = "budget-tracker:v1:" + (id || "demo");
      setKey(key);
      setEmail(email || null);
      setError("");
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : emptyData;
        if (!validData(parsed)) throw Error("Invalid saved data");
        setData(parsed);
      } catch {
        setData(emptyData);
        setError(
          "Saved data could not be loaded. Changes are blocked to protect it. Export or recover your browser storage before resetting it.",
        );
      }
      setReady(true);
    }
    if (!supabase) {
      load();
      return;
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError("Account session could not be loaded. Reload to try again.");
        return;
      }
      load(data.session?.user.id, data.session?.user.email);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => load(session?.user.id, session?.user.email),
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  function save(next: BudgetData) {
    if (!ready || error) return false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      return true;
    } catch {
      setError(
        "Browser storage is unavailable or full. Your last saved data is unchanged.",
      );
      return false;
    }
  }
  async function logout() {
    const result = await supabase?.auth.signOut();
    if (result?.error) {
      setError(result.error.message);
      return;
    }
    router.push("/login");
  }
  return (
    <BudgetContext.Provider value={{ data, ready, email, error, save, logout }}>
      {children}
    </BudgetContext.Provider>
  );
}
export function useBudget() {
  const c = useContext(BudgetContext);
  if (!c) throw Error("BudgetProvider required");
  return c;
}
