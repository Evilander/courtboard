import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase } from "./helpers/test-db";

describe("Screen Management & Heartbeat", () => {
  beforeAll(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it("creates a screen with all fields", async () => {
    const { createScreen, getScreenBySlug } = await import(
      "@/lib/data/screens"
    );

    const screen = createScreen({
      name: "Lobby Main Display",
      slug: "lobby-main",
      zone: "lobby",
      locationDescription: "Front entrance, left wall",
      rotationIntervalSeconds: 15,
      isActive: true,
    });

    expect(screen.id).toBeTruthy();
    expect(screen.slug).toBe("lobby-main");
    expect(screen.zone).toBe("lobby");

    const fetched = getScreenBySlug("lobby-main");
    expect(fetched).toBeDefined();
    expect(fetched!.name).toBe("Lobby Main Display");
  });

  it("records heartbeat and updates last_seen_at", async () => {
    const { createScreen, touchScreenHeartbeat, getScreenBySlug } =
      await import("@/lib/data/screens");

    createScreen({
      name: "Courtroom 1 Display",
      slug: "courtroom-1",
      zone: "courtroom",
      rotationIntervalSeconds: 15,
    });

    const before = getScreenBySlug("courtroom-1");
    expect(before!.lastSeenAt).toBeFalsy();

    touchScreenHeartbeat("courtroom-1");

    const after = getScreenBySlug("courtroom-1");
    expect(after!.lastSeenAt).toBeTruthy();
  });

  it("lists all screens with status", async () => {
    const { listScreens } = await import("@/lib/data/screens");
    const screens = listScreens();
    expect(screens.length).toBeGreaterThanOrEqual(2);
    expect(screens.some((s) => s.slug === "lobby-main")).toBe(true);
    expect(screens.some((s) => s.slug === "courtroom-1")).toBe(true);
  });

  it("deletes a screen", async () => {
    const { createScreen, deleteScreen, getScreenBySlug } = await import(
      "@/lib/data/screens"
    );

    const screen = createScreen({
      name: "Temp Screen",
      slug: "temp-screen",
      zone: "info",
      rotationIntervalSeconds: 30,
    });

    deleteScreen(screen.id);
    const fetched = getScreenBySlug("temp-screen");
    expect(fetched).toBeNull();
  });
});
