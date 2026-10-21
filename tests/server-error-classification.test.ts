import test from "node:test";
import assert from "node:assert/strict";
import { classifyUnexpectedFailure } from "../src/lib/server/error-classification.ts";

test("known transient database failures return a retryable service status", () => {
  for (const code of ["P1001", "P1002", "P2024", "P2028", "P2034"]) {
    const result = classifyUnexpectedFailure({ code, message: "private SQL details" });
    assert.equal(result.status, 503);
    assert.equal(result.code, "DATA_SERVICE_UNAVAILABLE");
    assert.doesNotMatch(result.message, /private SQL details/);
  }
  assert.equal(classifyUnexpectedFailure(new Error("Database unavailable")).status, 503);
});

test("unexpected server faults are not mislabeled as database outages", () => {
  const result = classifyUnexpectedFailure(new Error("private credentials in stack"));
  assert.equal(result.status, 500);
  assert.equal(result.code, "UNEXPECTED_ERROR");
  assert.doesNotMatch(result.message, /private credentials/);
});
