import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export function credentials() {
  return {
    name: "Browser Test",
    email: `browser-${randomUUID()}@example.test`,
    password: "test-only-budget-password",
  };
}
export async function createAccount(page: Page, baseURL: string) {
  const account = credentials();
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: baseURL },
    data: account,
  });
  expect(response.status(), await response.text()).toBe(200);
  return account;
}
export async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
