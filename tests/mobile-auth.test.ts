import test from "node:test";
import assert from "node:assert/strict";
import { bearerToken, mobileRequestHeadersAllowed, MOBILE_SESSION_DURATION_MS } from "../src/lib/mobile-auth.ts";
test("mobile requires one well-formed bearer credential", () => {
  const token = "a".repeat(64);
  assert.equal(bearerToken("Bearer " + token), token);
  for (const input of [null, "", "Basic " + token, "Bearer " + token + " ", "Bearer " + token.toUpperCase(), "Bearer " + "a".repeat(63)])
    assert.equal(bearerToken(input), null);
});
test("mobile endpoints reject browser origin and cookies", () => {
  assert.equal(mobileRequestHeadersAllowed(null, null), true);
  assert.equal(mobileRequestHeadersAllowed("https://untrusted.example", null), false);
  assert.equal(mobileRequestHeadersAllowed(null, "budget-session=token"), false);
});
test("mobile tokens have bounded seven-day expiry", () => {
  assert.equal(MOBILE_SESSION_DURATION_MS, 604800000);
});
