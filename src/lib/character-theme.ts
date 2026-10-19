export const characterThemes = ["sakura", "kuromi", "keroppi"] as const;
export type CharacterTheme = (typeof characterThemes)[number];
export const CHARACTER_THEME_KEY = "budget-tracker-character";
export function isCharacterTheme(value: unknown): value is CharacterTheme {
  return characterThemes.includes(value as CharacterTheme);
}
// Runs before paint so a saved character palette does not flash the default.
export const characterThemeScript = `(function(){try{var t=localStorage.getItem('${CHARACTER_THEME_KEY}');if(['sakura','kuromi','keroppi'].includes(t))document.documentElement.dataset.character=t}catch(e){}})()`;
