import { test, expect } from "@playwright/test";
import { createAccount, credentials, expectNoOverflow } from "./helpers";

test("register, sign out, recover from bad password, and log back in", async ({
  page,
}) => {
  const account = credentials();
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill(account.name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill(account.password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Monthly overview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("alert", { name: "Account access error" }),
  ).toContainText("Email or password is incorrect.");
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Monthly overview" }),
  ).toBeVisible();
});

test("budget and expenses persist, update the graph, and support editing and deletion", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByText("No spending to plot this month")).toBeVisible();
  const month = await page.getByLabel("Month", { exact: true }).inputValue();
  await page.getByLabel("Budget (AED)", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Monthly budget saved.")).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Description").fill("E2E groceries");
  await dialog.getByLabel("Amount (AED)").fill("12.50");
  await dialog.getByLabel("Date", { exact: true }).fill(`${month}-01`);
  await dialog.getByRole("button", { name: "Save expense" }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Monthly budget summary" }),
  ).toContainText("987.50");
  await expect(page.getByRole("img", { name: "Spending trend" })).toBeVisible();
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Daily", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("slider", { name: "Inspect day" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("slider")).toHaveAttribute(
    "aria-valuetext",
    new RegExp(`${month}-01:.*12.50`),
  );
  await page.getByText("View daily amounts", { exact: true }).click();
  await expect(
    page
      .getByRole("table")
      .getByRole("row")
      .filter({ hasText: `${month}-01` }),
  ).toContainText("12.50");
  await page.goto("/expenses");
  const row = page.getByRole("row").filter({ hasText: "E2E groceries" });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Amount (AED)").fill("15.00");
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(row).toContainText("15.00");
  await row.getByRole("button", { name: "Delete E2E groceries" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await expect(row).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByText("No expenses yet", { exact: true }),
  ).toBeVisible();
});

test("workspace navigation works on desktop and mobile and supports both themes", async ({
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Monthly overview" }),
  ).toBeVisible();
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await expect(
      page.getByRole("dialog", { name: "Your workspace" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await menu.click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Expense tracker", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } else {
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Expense tracker", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Expense tracker", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectNoOverflow(page);
  }
  await page.setViewportSize({ width: isMobile ? 375 : 1440, height: 1000 });
  for (const theme of ["Dark", "Light"]) {
    await page.getByRole("button", { name: `${theme} appearance` }).click();
    await expect(
      page.getByRole("button", { name: `${theme} appearance` }),
    ).toHaveAttribute("aria-pressed", "true");
    await testInfo.attach(`${theme.toLowerCase()}-dashboard`, {
      body: await page.screenshot({
        path: testInfo.outputPath(`${theme.toLowerCase()}-dashboard.png`),
        fullPage: true,
      }),
      contentType: "image/png",
    });
  }
});

test("a concurrent save cannot overwrite newer records", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByText("No spending to plot this month")).toBeVisible();
  const month = await page.getByLabel("Month", { exact: true }).inputValue();
  const snapshot = await (await page.request.get("/api/workspace")).json();
  const updated = await page.request.put("/api/workspace", {
    headers: { Origin: baseURL! },
    data: {
      data: { ...snapshot.data, budgets: { [month]: 200000 } },
      revision: snapshot.revision,
    },
  });
  expect(updated.status()).toBe(200);
  await page.getByLabel("Budget (AED)", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("alert", { name: "Workspace error" }),
  ).toContainText("another tab or device");
  await page.getByRole("button", { name: "Reload workspace" }).click();
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue(
    "2000",
  );
});

test("transient save failures can be retried without losing form data", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  let rejected = false;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT" && !rejected) {
      rejected = true;
      await route.fulfill({
        status: 503,
        json: { error: "Account service temporarily unavailable." },
      });
    } else {
      await route.continue();
    }
  });
  await page.getByLabel("Budget (AED)", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByRole("button", { name: "Reload workspace" })).toHaveCount(0);
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("1000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Monthly budget saved.")).toBeVisible();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toHaveCount(0);
  await page.unroute("**/api/workspace");
  await page.reload();
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("1000");
});

test("unconfirmed response requires reload to prevent ambiguous overwrite", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Monthly overview" })).toBeVisible();
  let putRequests = 0;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    putRequests++;
    await route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.getByLabel("Budget (AED)", { exact: true }).fill("700");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Workspace error" })).toContainText(
    "could not be confirmed",
  );
  await expect(page.getByRole("button", { name: "Reload workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(putRequests).toBe(1);
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Reload workspace" }).click();
  await expect(page.getByLabel("Budget (AED)", { exact: true })).toHaveValue("0");
});

test("load failures never show an empty financial dashboard", async ({
  page,
  baseURL,
}) => {
  await createAccount(page, baseURL!);
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Workspace temporarily unavailable." },
    }),
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("alert", { name: "Workspace error" }),
  ).toContainText("Workspace temporarily unavailable.");
  await expect(
    page.getByRole("heading", { name: "Monthly overview" }),
  ).not.toBeVisible();
  await expect(
    page.getByText("No spending to plot this month"),
  ).not.toBeVisible();
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Reload workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Monthly overview" }),
  ).toBeVisible();
});
