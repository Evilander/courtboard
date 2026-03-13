import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page with required fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h2")).toContainText("Admin sign-in");
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="totp"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Sign In");
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="username"]', "nonexistent");
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("p").filter({ hasText: /incorrect|credentials|sign in/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("redirects unauthenticated users from admin pages to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
