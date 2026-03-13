import { test, expect } from "@playwright/test";

test.describe("Public API Endpoints", () => {
  test("ready endpoint returns readiness checks", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.checks.database).toBe("ok");
    expect(body.checks.runtime).toBe("ok");
  });

  test("status endpoint requires authentication", async ({ request }) => {
    const response = await request.get("/api/status");
    expect(response.status()).toBe(401);
  });

  test("schedules GET returns entries array", async ({ request }) => {
    const response = await request.get("/api/schedules");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(Array.isArray(body.entries)).toBe(true);
  });

  test("screens GET returns screens array", async ({ request }) => {
    const response = await request.get("/api/screens");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(Array.isArray(body.screens)).toBe(true);
    expect(body.screens.length).toBeGreaterThanOrEqual(1);
  });

  test("protected POST returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/schedules", {
      data: {
        caseNumber: "2026-CF-999",
        caseTitle: "Test Case",
        caseType: "Criminal",
        judgeName: "Hon. Test",
        courtroom: "Room 1",
        scheduledTime: "09:00",
        status: "scheduled",
        date: "2026-03-12",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("protected POST /api/alerts returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/alerts", {
      data: { message: "Test alert" },
    });

    expect(response.status()).toBe(401);
  });

  test("SSE display endpoint starts streaming", async ({ page }) => {
    // Use page.evaluate to open an EventSource and check the first event
    await page.goto("/display/lobby-main");

    const gotEvent = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const es = new EventSource(
          "/api/sse/display?screen=lobby-main",
        );
        const timer = setTimeout(() => {
          es.close();
          resolve(false);
        }, 10000);

        es.addEventListener("open", () => {
          clearTimeout(timer);
          es.close();
          resolve(true);
        });

        es.addEventListener("error", () => {
          clearTimeout(timer);
          es.close();
          resolve(false);
        });
      });
    });

    expect(gotEvent).toBe(true);
  });
});
