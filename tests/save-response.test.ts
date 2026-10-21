import test from "node:test";
import assert from "node:assert/strict";
import { interpretSaveResponse } from "../src/lib/save-response.ts";

test("only a valid next revision confirms persistence", () => {
  assert.deepEqual(interpretSaveResponse(200, { revision: 4 }, 3), {
    kind: "saved",
    revision: 4,
  });
  for (const invalid of [null, {}, { revision: 3 }, { revision: 5 }, { revision: "4" }]) {
    const outcome = interpretSaveResponse(200, invalid, 3);
    assert.equal(outcome.kind, "rejected");
    if (outcome.kind === "rejected") assert.equal(outcome.reloadRequired, true);
  }
});

test("revision conflicts require reload rather than automatic retries", () => {
  const outcome = interpretSaveResponse(
    409,
    { error: "Your workspace changed in another tab or device." },
    3,
  );
  assert.equal(outcome.kind, "rejected");
  if (outcome.kind === "rejected") {
    assert.equal(outcome.reloadRequired, true);
    assert.match(outcome.message, /another tab or device/);
    assert.match(outcome.message, /Unsaved form entries/);
  }
});

test("session expiration requires reload to reauthenticate", () => {
  for (const status of [401, 403]) {
    const outcome = interpretSaveResponse(status, { error: "Unauthorized" }, 0);
    assert.equal(outcome.kind, "rejected");
    if (outcome.kind === "rejected") assert.equal(outcome.reloadRequired, true);
  }
});

test("service outages, rate limits, and invalid input do not permanently block retries", () => {
  for (const status of [400, 413, 415, 429, 500, 503, 504]) {
    const outcome = interpretSaveResponse(status, { error: "Try again." }, 2);
    assert.deepEqual(outcome, {
      kind: "rejected",
      message: "Try again.",
      reloadRequired: false,
    });
  }
});

test("non-JSON server errors have a usable fallback message", () => {
  const outcome = interpretSaveResponse(503, null, 1);
  assert.equal(outcome.kind, "rejected");
  if (outcome.kind === "rejected") {
    assert.equal(outcome.reloadRequired, false);
    assert.match(outcome.message, /temporarily unavailable/);
  }
});
