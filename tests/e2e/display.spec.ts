import { test, expect } from "@playwright/test";

test.describe("Display Pages", () => {
  test("lobby display renders courthouse name and clock", async ({ page }) => {
    await page.goto("/display/lobby-main");

    // Header elements
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Current Time")).toBeVisible();

    // Docket section
    await expect(page.getByText("Daily Docket")).toBeVisible();

    // Connection status text appears somewhere on the page
    await expect(
      page.getByText(/Connected|Syncing|Offline/),
    ).toBeVisible({ timeout: 15000 });
  });

  test("courtroom display shows screen name and judge info", async ({
    page,
  }) => {
    await page.goto("/display/courtroom-1");

    await expect(page.locator("text=Courtroom Schedule")).toBeVisible();
    await expect(
      page.locator("h2").filter({ hasText: /Courtroom/ }),
    ).toBeVisible();
  });

  test("display returns 404 for unknown screen slug", async ({ page }) => {
    const response = await page.goto("/display/nonexistent-screen");
    expect(response?.status()).toBe(404);
  });

  test("heartbeat API accepts screen slug", async ({ request }) => {
    const response = await request.post("/api/heartbeat", {
      data: { slug: "lobby-main" },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test("heartbeat API rejects unknown slug", async ({ request }) => {
    const response = await request.post("/api/heartbeat", {
      data: { slug: "nonexistent" },
    });

    expect(response.status()).toBe(404);
  });
});
