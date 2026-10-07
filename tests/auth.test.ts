import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  sessionToken,
  tokenHash,
} from "../src/lib/auth-crypto.ts";
import { validWorkspace } from "../src/lib/workspace-validation.ts";
test("passwords use random salts and reject incorrect credentials", async () => {
  const hash = await hashPassword("correct-horse-123");
  assert.notEqual(hash, await hashPassword("correct-horse-123"));
  assert.ok(await verifyPassword("correct-horse-123", hash));
  assert.equal(await verifyPassword("incorrect", hash), false);
  assert.equal(await verifyPassword("correct-horse-123", "broken"), false);
});
test("session identifiers have entropy and only hashes are persisted", () => {
  const a = sessionToken(),
    b = sessionToken();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(tokenHash(a), a);
  assert.equal(tokenHash(a), tokenHash(a));
});
test("server validation rejects impossible dates, duplicate IDs and oversized amounts", () => {
  const expense = {
    id: "11111111-1111-4111-8111-111111111111",
    description: "Lunch",
    date: "2026-10-07",
    amount: 1250,
    category: "Food",
  };
  assert.ok(
    validWorkspace({ expenses: [expense], budgets: { "2026-10": 50000 } }),
  );
  assert.equal(
    validWorkspace({ expenses: [expense, expense], budgets: {} }),
    false,
  );
  assert.equal(
    validWorkspace({
      expenses: [{ ...expense, date: "2026-02-30" }],
      budgets: {},
    }),
    false,
  );
  assert.equal(
    validWorkspace({
      expenses: [{ ...expense, amount: Number.MAX_SAFE_INTEGER }],
      budgets: {},
    }),
    false,
  );
  assert.equal(
    validWorkspace({ expenses: [], budgets: { "2026-13": 100 } }),
    false,
  );
  assert.equal(
    validWorkspace({
      expenses: [{ ...expense, description: " " }],
      budgets: {},
    }),
    false,
  );
});
