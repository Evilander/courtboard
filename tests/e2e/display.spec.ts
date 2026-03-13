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
      page.getByText(/Connected|Syncing|Offline|Reconnecting/),
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

  test("heartbeat API accepts an active display session", async ({ page }) => {
    await page.goto("/display/lobby-main");

    const response = await page.request.post("/api/heartbeat", {
      data: { slug: "lobby-main" },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test("heartbeat API rejects requests without a display session", async ({
    request,
  }) => {
    const response = await request.post("/api/heartbeat", {
      data: { slug: "lobby-main" },
    });

    expect(response.status()).toBe(403);
  });

  test("heartbeat API rejects unknown slug", async ({ page }) => {
    await page.goto("/display/lobby-main");

    const response = await page.request.post("/api/heartbeat", {
      data: { slug: "nonexistent" },
    });

    expect(response.status()).toBe(404);
  });

  test("heartbeat API rejects mismatched display sessions", async ({ page }) => {
    await page.goto("/display/lobby-main");

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "courtroom-1" }),
      });

      return response.status;
    });

    expect(result).toBe(403);
  });
});
