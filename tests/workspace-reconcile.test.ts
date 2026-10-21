import test from "node:test";
import assert from "node:assert/strict";
import { planRecordChanges, reconcileRecords } from "../src/lib/workspace-reconcile.ts";

test("unchanged persisted scalars never generate updates", () => {
  const existing = [{ id: "a", userId: "owner", amount: 12n, createdAt: new Date() }];
  const desired = [{ id: "a", userId: "owner", amount: 12n }];
  assert.deepEqual(planRecordChanges(existing, desired, (r) => r.id, (r) => r.id), {
    remove: [], insert: [], update: [],
  });
});

test("deletes, additions, and modified values are isolated", () => {
  const current = [{ id: "a", amount: 12n }, { id: "b", amount: 20n }, { id: "old", amount: 50n }];
  const next = [{ id: "a", amount: 12n }, { id: "b", amount: 21n }, { id: "new", amount: 4n }];
  assert.deepEqual(planRecordChanges(current, next, (r) => r.id, (r) => r.id), {
    remove: ["old"], insert: [next[2]], update: [next[1]],
  });
});

test("compound allocation keys distinguish categories", () => {
  const key = (r: { month: string; category: string }) => r.month + "|" + r.category;
  const before = [{ month: "2026-10", category: "Food", amount: 100n }];
  const after = [{ month: "2026-10", category: "Housing", amount: 100n }, before[0]];
  assert.deepEqual(planRecordChanges(before, after, key, key), {
    remove: [], insert: [after[0]], update: [],
  });
});

test("duplicate keys cause no database operations", async () => {
  const calls: string[] = [];
  await assert.rejects(reconcileRecords(
    [],
    [{ id: "x", amount: 1 }, { id: "x", amount: 2 }],
    (r: { id: string }) => r.id, (r) => r.id,
    {
      remove: async () => { calls.push("remove"); },
      insert: async () => { calls.push("insert"); },
      update: async () => { calls.push("update"); },
    },
  ), /Duplicate record key/);
  assert.deepEqual(calls, []);
});

test("unchanged sets do zero writes, modified sets only necessary writes", async () => {
  const calls: string[] = [];
  const ops = {
    remove: async (keys: string[]) => { calls.push("delete:" + keys.join(",")); },
    insert: async (rows: { id: string; amount: number }[]) => { calls.push("insert:" + rows.map(r => r.id).join(",")); },
    update: async (r: { id: string; amount: number }) => { calls.push("update:" + r.id); },
  };
  const existing = [{ id: "a", amount: 2 }, { id: "b", amount: 3 }];
  const key = (r: { id: string }) => r.id;
  await reconcileRecords(existing, [...existing], key, key, ops);
  assert.deepEqual(calls, []);
  await reconcileRecords(existing, [{ id: "b", amount: 5 }, { id: "c", amount: 9 }], key, key, ops);
  assert.deepEqual(calls, ["delete:a", "insert:c", "update:b"]);
});
