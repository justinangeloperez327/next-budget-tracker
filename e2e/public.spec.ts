import { test, expect } from "@playwright/test";
import { expectNoOverflow } from "./helpers";

test("public pages are responsive and workspace requires authentication", async ({
  page,
}, testInfo) => {
  for (const path of ["/", "/login", "/register", "/about", "/contact"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflow(page);
      if ((path === "/" || path === "/login") && [375, 1440].includes(width)) {
        await page.screenshot({
          path: testInfo.outputPath(
            `${path === "/" ? "home" : "login"}-${width}.png`,
          ),
          fullPage: true,
        });
      }
    }
  }
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("password confirmation blocks mismatches without sending credentials", async ({
  page,
}) => {
  let posted = false;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/register")) posted = true;
  });
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Test User");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-one");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("test-password-two");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("alert", { name: "Account access error" }),
  ).toHaveText("Passwords do not match.");
  expect(posted).toBe(false);
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveAttribute("type", "text");
});

test("appearance is keyboard accessible and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  const dark = page.getByRole("button", { name: "Dark appearance" });
  await expect(dark).toBeEnabled();
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Light appearance" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
