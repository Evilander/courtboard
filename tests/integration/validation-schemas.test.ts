import { describe, it, expect } from "vitest";

describe("Validation Schemas", () => {
  it("validates schedule entry schema — accepts valid data", async () => {
    const { scheduleEntrySchema } = await import("@/lib/validation");

    const result = scheduleEntrySchema.safeParse({
      caseNumber: "2026-CF-001",
      caseTitle: "State v. Smith",
      caseType: "Criminal",
      judgeName: "Hon. Williams",
      courtroom: "Courtroom 3",
      scheduledTime: "09:00",
      estimatedDuration: 60,
      status: "scheduled",
      date: "2026-03-12",
    });

    expect(result.success).toBe(true);
  });

  it("validates schedule entry schema — rejects invalid date format", async () => {
    const { scheduleEntrySchema } = await import("@/lib/validation");

    const result = scheduleEntrySchema.safeParse({
      caseNumber: "2026-CF-001",
      caseTitle: "State v. Smith",
      caseType: "Criminal",
      judgeName: "Hon. Williams",
      courtroom: "Courtroom 3",
      scheduledTime: "09:00",
      status: "scheduled",
      date: "March 12, 2026", // Invalid format — must be YYYY-MM-DD
    });

    expect(result.success).toBe(false);
  });

  it("validates schedule entry schema — rejects invalid status", async () => {
    const { scheduleEntrySchema } = await import("@/lib/validation");

    const result = scheduleEntrySchema.safeParse({
      caseNumber: "2026-CF-001",
      caseTitle: "State v. Smith",
      caseType: "Criminal",
      judgeName: "Hon. Williams",
      courtroom: "Courtroom 3",
      scheduledTime: "09:00",
      status: "invalid_status",
      date: "2026-03-12",
    });

    expect(result.success).toBe(false);
  });

  it("validates screen schema — enforces rotation interval bounds", async () => {
    const { screenSchema } = await import("@/lib/validation");

    const tooShort = screenSchema.safeParse({
      name: "Test",
      slug: "test",
      zone: "lobby",
      rotationIntervalSeconds: 2, // below minimum of 5
    });
    expect(tooShort.success).toBe(false);

    const tooLong = screenSchema.safeParse({
      name: "Test",
      slug: "test",
      zone: "lobby",
      rotationIntervalSeconds: 999, // above maximum of 600
    });
    expect(tooLong.success).toBe(false);

    const valid = screenSchema.safeParse({
      name: "Test",
      slug: "test",
      zone: "lobby",
      rotationIntervalSeconds: 15,
    });
    expect(valid.success).toBe(true);
  });

  it("validates user create schema — enforces 12-char minimum password", async () => {
    const { userCreateSchema } = await import("@/lib/validation");

    const short = userCreateSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      name: "Test User",
      password: "Short1!",
      role: "viewer",
    });
    expect(short.success).toBe(false);

    const valid = userCreateSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      name: "Test User",
      password: "LongEnoughP@ss1",
      role: "viewer",
    });
    expect(valid.success).toBe(true);
  });

  it("validates alert schema — requires message", async () => {
    const { alertSchema } = await import("@/lib/validation");

    const empty = alertSchema.safeParse({ message: "" });
    expect(empty.success).toBe(false);

    const valid = alertSchema.safeParse({
      message: "Building evacuation — exit immediately",
    });
    expect(valid.success).toBe(true);
  });
});
