import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase } from "./helpers/test-db";

describe("Content Management", () => {
  let db: ReturnType<typeof setupTestDatabase>["db"];

  beforeAll(() => {
    const result = setupTestDatabase();
    db = result.db;
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it("creates and lists content items by zone", async () => {
    const { createContentItem, listContentItems } = await import(
      "@/lib/data/content"
    );

    createContentItem({
      type: "announcement",
      title: "Lobby Announcement",
      body: "Welcome to the courthouse",
      zoneFilter: "lobby",
      displayOrder: 0,
    });

    createContentItem({
      type: "announcement",
      title: "Info Announcement",
      body: "Voting registration open",
      zoneFilter: "info",
      displayOrder: 0,
    });

    const lobbyItems = listContentItems({ zone: "lobby" });
    expect(lobbyItems.length).toBe(1);
    expect(lobbyItems[0].title).toBe("Lobby Announcement");

    const infoItems = listContentItems({ zone: "info" });
    expect(infoItems.length).toBe(1);
    expect(infoItems[0].title).toBe("Info Announcement");
  });

  it("creates and clears emergency alerts", async () => {
    const {
      createContentItem,
      clearEmergencyAlerts,
      listActiveContentForZone,
    } = await import("@/lib/data/content");

    createContentItem({
      type: "announcement",
      title: "BUILDING EVACUATION",
      body: "Exit through the nearest emergency exit immediately.",
      zoneFilter: "all",
      isEmergency: true,
      displayOrder: 0,
    });

    const activeContent = listActiveContentForZone("all");
    const emergencies = activeContent.filter((item) => item.isEmergency);
    expect(emergencies.length).toBeGreaterThanOrEqual(1);
    expect(emergencies[0].title).toBe("BUILDING EVACUATION");

    clearEmergencyAlerts();

    const afterClear = listActiveContentForZone("all");
    const emergenciesAfter = afterClear.filter((item) => item.isEmergency);
    expect(emergenciesAfter.length).toBe(0);
  });

  it("filters content by active time windows", async () => {
    const { createContentItem, listActiveContentForZone } = await import(
      "@/lib/data/content"
    );

    // Future content — should NOT appear
    createContentItem({
      type: "announcement",
      title: "Future Event",
      body: "This starts tomorrow",
      zoneFilter: "all",
      startsAt: new Date(Date.now() + 86400000),
      displayOrder: 10,
    });

    // Expired content — should NOT appear
    createContentItem({
      type: "announcement",
      title: "Expired Event",
      body: "This expired yesterday",
      zoneFilter: "all",
      expiresAt: new Date(Date.now() - 86400000),
      displayOrder: 11,
    });

    // Active content — should appear
    createContentItem({
      type: "announcement",
      title: "Active Now",
      body: "Currently active",
      zoneFilter: "all",
      startsAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 3600000),
      displayOrder: 12,
    });

    const active = listActiveContentForZone("all");
    const titles = active.map((item) => item.title);
    expect(titles).toContain("Active Now");
    expect(titles).not.toContain("Future Event");
    expect(titles).not.toContain("Expired Event");
  });
});
