"use client";

import { useSyncExternalStore } from "react";
import { Flower2 } from "lucide-react";
import { AnimeCompanion } from "@/components/anime-companion";
import { SakuraCat } from "@/components/sakura-companion";
import {
  CHARACTER_THEME_KEY,
  characterThemeLabels,
  isCharacterTheme,
  type CharacterTheme,
} from "@/lib/character-theme";

const EVENT = "budget-character-change";
function subscribe(notify: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== CHARACTER_THEME_KEY && event.key !== null) return;
    document.documentElement.dataset.character = isCharacterTheme(
      event.newValue,
    )
      ? event.newValue
      : "sakura";
    notify();
  }
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", storage);
  };
}
function snapshot(): CharacterTheme {
  const value = document.documentElement.dataset.character;
  return isCharacterTheme(value) ? value : "sakura";
}
export function useCharacterTheme() {
  return useSyncExternalStore(
    subscribe,
    snapshot,
    () => "sakura" as CharacterTheme,
  );
}
export function setCharacterTheme(theme: CharacterTheme) {
  document.documentElement.dataset.character = theme;
  try {
    localStorage.setItem(CHARACTER_THEME_KEY, theme);
  } catch {
    /* The current tab can still change themes when storage is unavailable. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function ThemeCompanion({
  theme,
  className = "",
}: {
  theme?: CharacterTheme;
  className?: string;
}) {
  const current = useCharacterTheme();
  const character = theme ?? current;
  if (character === "sakura") return <SakuraCat className={className} />;
  if (character !== "kuromi" && character !== "keroppi")
    return <AnimeCompanion character={character} className={className} />;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 110"
      className={className}
      fill="none"
    >
      {character === "kuromi" ? (
        <>
          <path
            d="M24 42 12 14Q12 8 19 13L43 30Q60 23 77 30L101 13Q108 8 108 14L96 42Q108 58 101 78Q92 99 60 101Q28 99 19 78Q12 58 24 42Z"
            fill="#302637"
            stroke="#302637"
            strokeWidth="2"
          />
          <circle cx="13" cy="12" r="6" fill="#302637" />
          <circle cx="107" cy="12" r="6" fill="#302637" />
          <path
            d="M29 59Q40 48 60 58Q80 48 91 59Q101 86 60 92Q19 86 29 59Z"
            fill="#fff7fc"
          />
          <path
            d="m37 69 9-3m28 0 9 3"
            stroke="#302637"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="46" cy="73" rx="3" ry="5" fill="#302637" />
          <ellipse cx="74" cy="73" rx="3" ry="5" fill="#302637" />
          <ellipse cx="34" cy="80" rx="6" ry="3" fill="#efb0ca" />
          <ellipse cx="86" cy="80" rx="6" ry="3" fill="#efb0ca" />
          <path
            d="m56 82 4 3 4-3"
            stroke="#302637"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M49 38Q49 28 60 28Q71 28 71 38Q71 45 65 46V50H55V46Q49 45 49 38Z"
            fill="#eea6c7"
          />
          <circle cx="56" cy="38" r="2" fill="#302637" />
          <circle cx="64" cy="38" r="2" fill="#302637" />
          <path
            d="m44 99 9-7 7 8 7-8 9 7"
            stroke="#eea6c7"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <ellipse
            cx="60"
            cy="65"
            rx="45"
            ry="29"
            fill="#93c95d"
            stroke="#36592b"
            strokeWidth="2"
          />
          <ellipse
            cx="39"
            cy="35"
            rx="22"
            ry="27"
            fill="#93c95d"
            stroke="#36592b"
            strokeWidth="2"
          />
          <ellipse
            cx="81"
            cy="35"
            rx="22"
            ry="27"
            fill="#93c95d"
            stroke="#36592b"
            strokeWidth="2"
          />
          <ellipse cx="40" cy="34" rx="17" ry="22" fill="#fffef5" />
          <ellipse cx="80" cy="34" rx="17" ry="22" fill="#fffef5" />
          <ellipse cx="47" cy="37" rx="5" ry="8" fill="#243c25" />
          <ellipse cx="73" cy="37" rx="5" ry="8" fill="#243c25" />
          <ellipse cx="27" cy="69" rx="9" ry="6" fill="#f0a5ac" />
          <ellipse cx="93" cy="69" rx="9" ry="6" fill="#f0a5ac" />
          <path
            d="m48 70 12 11 12-11"
            stroke="#243c25"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M36 91Q60 100 84 91L88 108H32Z"
            fill="#fffef5"
            stroke="#36592b"
            strokeWidth="2"
          />
          <path d="m43 95 17 5 17-5v12l-17-4-17 4Z" fill="#b53e4c" />
          <circle cx="60" cy="101" r="4" fill="#d25b66" />
        </>
      )}
    </svg>
  );
}
export function ThemeStamp() {
  const theme = useCharacterTheme();
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-dashed bg-card px-3 py-1.5 text-xs text-primary">
      <Flower2 size={14} aria-hidden="true" />
      {characterThemeLabels[theme]} notebook
    </span>
  );
}
export function ThemeMark() {
  const theme = useCharacterTheme();
  return theme === "sakura" ? (
    <Flower2 className="size-4" aria-hidden="true" />
  ) : (
    <ThemeCompanion className="w-7" />
  );
}
