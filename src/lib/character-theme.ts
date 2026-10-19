export const characterThemes = [
  "sakura",
  "kuromi",
  "keroppi",
  "vegeta",
  "naruto",
  "kakashi",
  "sasuke",
  "ichigo",
] as const;
export type CharacterTheme = (typeof characterThemes)[number];
export const CHARACTER_THEME_KEY = "budget-tracker-character";
export function isCharacterTheme(value: unknown): value is CharacterTheme {
  return characterThemes.includes(value as CharacterTheme);
}
// Runs before paint so a saved character palette does not flash the default.
export const characterThemeScript = `(function(){try{var t=localStorage.getItem('${CHARACTER_THEME_KEY}');if(${JSON.stringify(characterThemes)}.includes(t))document.documentElement.dataset.character=t}catch(e){}})()`;

export const characterThemeLabels: Record<CharacterTheme, string> = {
  sakura: "Sakura",
  kuromi: "Kuromi",
  keroppi: "Keroppi",
  vegeta: "Vegeta",
  naruto: "Naruto",
  kakashi: "Kakashi",
  sasuke: "Sasuke",
  ichigo: "Ichigo",
};
