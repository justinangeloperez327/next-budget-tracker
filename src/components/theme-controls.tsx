"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";
import { Sun, Moon, Palette, Monitor } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ThemeCompanion,
  setCharacterTheme,
  useCharacterTheme,
} from "@/components/character-theme";
import { characterThemes, characterThemeLabels } from "@/lib/character-theme";

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
  const character = useCharacterTheme();
  const id = useId();
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
      {[
        { value: "light", label: "Light", Icon: Sun },
        { value: "dark", label: "Dark", Icon: Moon },
      ].map(({ value, label, Icon }) => (
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
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="size-11"
            aria-label="Choose character theme"
            title="Choose character theme"
          >
            <Palette className="size-4" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose your theme</DialogTitle>
            <DialogDescription>
              Pick a character style and your preferred appearance.
            </DialogDescription>
          </DialogHeader>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">
              Character theme
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {characterThemes.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-2 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${character === value ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                >
                  <input
                    className="size-4 accent-primary"
                    type="radio"
                    name={`${id}-character`}
                    value={value}
                    checked={character === value}
                    onChange={() => setCharacterTheme(value)}
                  />
                  <ThemeCompanion
                    theme={value}
                    className="h-20 w-full max-w-20"
                  />
                  <span>{characterThemeLabels[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            type="button"
            variant="outline"
            aria-label="System appearance"
            aria-pressed={mounted && theme === "system"}
            onClick={() => setTheme("system")}
          >
            <Monitor className="size-4" aria-hidden="true" />
            Use device appearance
          </Button>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
