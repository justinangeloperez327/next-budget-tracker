"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const subscribe = () => () => {};
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="budget-tracker-appearance"
    >
      {children}
    </ThemeProvider>
  );
}
export function ThemeControls() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <fieldset
      aria-label="Appearance"
      className="inline-flex shrink-0 gap-1 rounded-lg border bg-card p-1"
    >
      {(
        [
          { value: "light", label: "Light", Icon: Sun },
          { value: "dark", label: "Dark", Icon: Moon },
          { value: "system", label: "System", Icon: Monitor },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} appearance`}
          title={`${label} appearance`}
          aria-pressed={mounted && theme === value}
          disabled={!mounted}
          onClick={() => setTheme(value)}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-muted aria-pressed:text-primary disabled:opacity-50"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </fieldset>
  );
}
