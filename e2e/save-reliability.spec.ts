import { test, expect } from "@playwright/test";
import { createAccount } from "./helpers";

test("two signed-in tabs cannot overwrite each other's changes", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  const second = await page.context().newPage();
  try {
    await second.goto("/dashboard");
    await expect(second.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
    const month = await page.getByLabel("Month", { exact: true }).inputValue();
    await second.getByLabel("Budget (AED)", { exact: true }).fill("1300");
    await second.getByRole("button", { name: "Save", exact: true }).click();
    await expect(second.getByText("Monthly budget saved.")).toBeVisible();

    await page.getByLabel("Budget (AED)", { exact: true }).fill("900");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
      "another tab or device",
    );
    await expect(page.getByRole("button", { name: "Reload workspace" })).toBeVisible();
    await page.getByRole("button", { name: "Reload workspace" }).click();
    await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("1300");
    const snapshot = await (await page.request.get("/api/workspace")).json();
    expect(snapshot.revision).toBe(1);
    expect(snapshot.data.budgets[month]).toBe(130000);
  } finally {
    await second.close();
  }
});

test("a failed transport request is retryable without dropping the edit", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  let failed = false;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT" && !failed) {
      failed = true;
      return route.abort("failed");
    }
    return route.continue();
  });
  const month = await page.getByLabel("Month", { exact: true }).inputValue();
  await page.getByLabel("Budget (AED)", { exact: true }).fill("675.25");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "could not be confirmed",
  );
  await expect(page.getByRole("button", { name: "Reload workspace" })).toHaveCount(0);
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("675.25");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Monthly budget saved.")).toBeVisible();
  await page.unroute("**/api/workspace");
  const snapshot = await (await page.request.get("/api/workspace")).json();
  expect(snapshot.revision).toBe(1);
  expect(snapshot.data.budgets[month]).toBe(67525);
});

test("a lost acknowledgement after server commit cannot duplicate the save", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  const month = await page.getByLabel("Month", { exact: true }).inputValue();
  let lostResponse = false;
  let saves = 0;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    saves += 1;
    if (!lostResponse) {
      lostResponse = true;
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      return route.abort("failed");
    }
    return route.continue();
  });

  await page.getByLabel("Budget (AED)", { exact: true }).fill("890");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "could not be confirmed",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "another tab or device",
  );
  expect(saves).toBe(2);
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Reload workspace" }).click();
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("890");
  const snapshot = await (await page.request.get("/api/workspace")).json();
  expect(snapshot.revision).toBe(1);
  expect(snapshot.data.budgets[month]).toBe(89000);
});

test("an expired save session blocks retries until reauthentication", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  let requests = 0;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    requests += 1;
    return route.fulfill({ status: 401, json: { error: "Session expired" } });
  });
  await page.getByLabel("Budget (AED)", { exact: true }).fill("501");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "no longer authorized",
  );
  await expect(page.getByRole("button", { name: "Reload workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(requests).toBe(1);
  await page.unroute("**/api/workspace");
  const snapshot = await (await page.request.get("/api/workspace")).json();
  expect(snapshot.revision).toBe(0);
});
