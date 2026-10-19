import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  characterThemeScript,
  characterThemes,
  isCharacterTheme,
} from "../src/lib/character-theme.ts";

test("only supported character themes are accepted", () => {
  for (const value of characterThemes)
    assert.equal(isCharacterTheme(value), true);
  for (const value of [null, undefined, "teal", "dark", "<script>"])
    assert.equal(isCharacterTheme(value), false);
});

test("prepaint script restores a saved theme and ignores invalid storage", () => {
  for (const saved of [...characterThemes, null, "invalid"]) {
    const document = { documentElement: { dataset: { character: "sakura" } } };
    runInNewContext(characterThemeScript, {
      document,
      localStorage: { getItem: () => saved },
    });
    assert.equal(
      document.documentElement.dataset.character,
      isCharacterTheme(saved) ? saved : "sakura",
    );
  }
});

test("blocked browser storage leaves the default theme usable", () => {
  const document = { documentElement: { dataset: { character: "sakura" } } };
  assert.doesNotThrow(() =>
    runInNewContext(characterThemeScript, {
      document,
      localStorage: {
        getItem: () => {
          throw new Error("Storage blocked");
        },
      },
    }),
  );
  assert.equal(document.documentElement.dataset.character, "sakura");
});
