import test from "node:test";
import assert from "node:assert/strict";
import { WORKSPACE_MUTATION_BATCH_SIZE, planRecordChanges, reconcileRecords, retainedChildren } from "../src/lib/workspace-reconcile.ts";

test("unchanged persisted scalars never generate updates", () => {
  const existing = [{ id: "a", userId: "owner", amount: BigInt(12), createdAt: new Date() }];
  const desired = [{ id: "a", userId: "owner", amount: BigInt(12) }];
  assert.deepEqual(planRecordChanges(existing, desired, (r) => r.id, (r) => r.id), {
    remove: [], insert: [], update: [],
  });
});

test("deletes, additions, and modified values are isolated", () => {
  const current = [{ id: "a", amount: BigInt(12) }, { id: "b", amount: BigInt(20) }, { id: "old", amount: BigInt(50) }];
  const next = [{ id: "a", amount: BigInt(12) }, { id: "b", amount: BigInt(21) }, { id: "new", amount: BigInt(4) }];
  assert.deepEqual(planRecordChanges(current, next, (r) => r.id, (r) => r.id), {
    remove: ["old"], insert: [next[2]], update: [next[1]],
  });
});

test("compound allocation keys distinguish categories", () => {
  const key = (r: { month: string; category: string }) => r.month + "|" + r.category;
  const before = [{ month: "2026-10", category: "Food", amount: BigInt(100) }];
  const after = [{ month: "2026-10", category: "Housing", amount: BigInt(100) }, before[0]];
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

test("retained children excludes deleted parents and scales with keyed membership", () => {
  const current = Array.from({ length: 1_200 }, (_, index) => ({
    id: `parent-${index}`,
    payments: [{ id: `payment-${index}`, owner: `parent-${index}` }],
  }));
  const desired = Array.from({ length: 600 }, (_, index) => ({ id: `parent-${index * 2}` }));
  const children = retainedChildren(
    current, desired, (row) => row.id, (row) => row.id, (row) => row.payments,
  );
  assert.equal(children.length, 600);
  assert.deepEqual(children[0], { id: "payment-0", owner: "parent-0" });
  assert.ok(children.every((child) => Number(child.id.slice(8)) % 2 === 0));
});

test("large inserts are split into bounded calls, including the final partial batch", async () => {
  const existing: { id: string }[] = [];
  const incoming = Array.from({ length: 601 }, (_, index) => ({ id: String(index) }));
  const sizes: number[] = [];
  const operations = {
    remove: async () => { assert.fail("no removals expected"); },
    insert: async (rows: { id: string }[]) => { sizes.push(rows.length); },
    update: async () => { assert.fail("no updates expected"); },
  };
  await reconcileRecords(existing, incoming, (row) => row.id, (row) => row.id, operations);
  assert.equal(WORKSPACE_MUTATION_BATCH_SIZE, 250);
  assert.deepEqual(sizes, [250, 250, 101]);
});

test("large removals are split into bounded batches without extra inserts", async () => {
  const existing = Array.from({ length: 505 }, (_, index) => ({ id: String(index) }));
  const sizes: number[] = [];
  await reconcileRecords(existing, [], (row) => row.id, (row: { id: string }) => row.id, {
    remove: async (keys) => { sizes.push(keys.length); },
    insert: async () => { assert.fail("no inserts expected"); },
    update: async () => { assert.fail("no updates expected"); },
  });
  assert.deepEqual(sizes, [250, 250, 5]);
});

test("a failed batch stops later writes so the enclosing transaction can roll back", async () => {
  const incoming = Array.from({ length: 501 }, (_, index) => ({ id: String(index) }));
  let attempts = 0;
  await assert.rejects(
    reconcileRecords([], incoming, (row: { id: string }) => row.id, (row) => row.id, {
      remove: async () => { assert.fail("no removes expected"); },
      insert: async () => {
        attempts += 1;
        if (attempts === 2) throw Error("simulated database failure");
      },
      update: async () => { assert.fail("no updates expected"); },
    }),
    /simulated database failure/,
  );
  assert.equal(attempts, 2);
});
