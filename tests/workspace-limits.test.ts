import test from "node:test";
import assert from "node:assert/strict";
import { MAX_WORKSPACE_REQUEST_BYTES, jsonByteLength } from "../src/lib/workspace-limits.ts";

test("workspace body limit is a deliberate, finite 2 MiB", () => {
  assert.equal(MAX_WORKSPACE_REQUEST_BYTES, 2 * 1024 * 1024);
});

test("request size uses UTF-8 bytes, not JavaScript code units", () => {
  assert.equal(jsonByteLength("abc"), 3);
  assert.equal(jsonByteLength("₱"), 3);
  assert.equal(jsonByteLength("💰"), 4);
  const payload = JSON.stringify({ notes: "₱".repeat(1000) });
  assert.ok(jsonByteLength(payload) > payload.length);
});

test("payload boundaries are exact and deterministic", () => {
  assert.equal(jsonByteLength("a".repeat(MAX_WORKSPACE_REQUEST_BYTES)), MAX_WORKSPACE_REQUEST_BYTES);
  assert.equal(jsonByteLength("a".repeat(MAX_WORKSPACE_REQUEST_BYTES + 1)), MAX_WORKSPACE_REQUEST_BYTES + 1);
});
