import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase } from "./helpers/test-db";

describe("Schedule CRUD Operations", () => {
  let db: ReturnType<typeof setupTestDatabase>["db"];

  beforeAll(() => {
    const result = setupTestDatabase();
    db = result.db;
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it("creates a schedule entry with all required fields", async () => {
    const { createScheduleEntry } = await import("@/lib/data/schedules");

    const entry = createScheduleEntry({
      caseNumber: "2026-CF-001234",
      caseTitle: "State v. Smith",
      caseType: "Criminal Felony",
      judgeName: "Hon. Patricia Williams",
      courtroom: "Courtroom 3A",
      scheduledTime: "09:00",
      estimatedDuration: 60,
      status: "scheduled",
      date: "2026-03-12",
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeTruthy();
    expect(entry.caseNumber).toBe("2026-CF-001234");
    expect(entry.caseTitle).toBe("State v. Smith");
    expect(entry.judgeName).toBe("Hon. Patricia Williams");
    expect(entry.status).toBe("scheduled");
  });

  it("lists schedule entries filtered by date", async () => {
    const { createScheduleEntry, listScheduleEntries } = await import(
      "@/lib/data/schedules"
    );

    createScheduleEntry({
      caseNumber: "2026-CF-002",
      caseTitle: "State v. Jones",
      caseType: "Criminal",
      judgeName: "Hon. Smith",
      courtroom: "Courtroom 1",
      scheduledTime: "10:00",
      status: "scheduled",
      date: "2026-03-13",
    });

    createScheduleEntry({
      caseNumber: "2026-CF-003",
      caseTitle: "State v. Brown",
      caseType: "Criminal",
      judgeName: "Hon. Smith",
      courtroom: "Courtroom 1",
      scheduledTime: "11:00",
      status: "scheduled",
      date: "2026-03-14",
    });

    const march13 = listScheduleEntries({ date: "2026-03-13" });
    expect(march13.length).toBe(1);
    expect(march13[0].caseNumber).toBe("2026-CF-002");

    const march14 = listScheduleEntries({ date: "2026-03-14" });
    expect(march14.length).toBe(1);
    expect(march14[0].caseNumber).toBe("2026-CF-003");
  });

  it("updates a schedule entry status", async () => {
    const {
      createScheduleEntry,
      updateScheduleEntry,
      getScheduleEntryById,
    } = await import("@/lib/data/schedules");

    const entry = createScheduleEntry({
      caseNumber: "2026-CV-100",
      caseTitle: "Doe v. Roe",
      caseType: "Civil",
      judgeName: "Hon. Anderson",
      courtroom: "Courtroom 2",
      scheduledTime: "14:00",
      status: "scheduled",
      date: "2026-03-12",
    });

    const updated = updateScheduleEntry(entry.id, { status: "in_progress" });
    expect(updated).toBeDefined();
    expect(updated!.status).toBe("in_progress");

    const fetched = getScheduleEntryById(entry.id);
    expect(fetched!.status).toBe("in_progress");
  });

  it("deletes a schedule entry", async () => {
    const {
      createScheduleEntry,
      deleteScheduleEntry,
      getScheduleEntryById,
    } = await import("@/lib/data/schedules");

    const entry = createScheduleEntry({
      caseNumber: "2026-DELETE-ME",
      caseTitle: "To Be Deleted",
      caseType: "Civil",
      judgeName: "Hon. Nobody",
      courtroom: "Courtroom 5",
      scheduledTime: "16:00",
      status: "scheduled",
      date: "2026-03-12",
    });

    const deleted = deleteScheduleEntry(entry.id);
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(entry.id);

    const fetched = getScheduleEntryById(entry.id);
    expect(fetched).toBeNull();
  });

  it("bulk marks entries as completed", async () => {
    const { createScheduleEntry, bulkUpdateSchedules } = await import(
      "@/lib/data/schedules"
    );

    const e1 = createScheduleEntry({
      caseNumber: "BULK-001",
      caseTitle: "Bulk Test 1",
      caseType: "Civil",
      judgeName: "Hon. Bulk",
      courtroom: "Courtroom 1",
      scheduledTime: "09:00",
      status: "scheduled",
      date: "2026-03-15",
    });

    const e2 = createScheduleEntry({
      caseNumber: "BULK-002",
      caseTitle: "Bulk Test 2",
      caseType: "Civil",
      judgeName: "Hon. Bulk",
      courtroom: "Courtroom 1",
      scheduledTime: "10:00",
      status: "scheduled",
      date: "2026-03-15",
    });

    const results = bulkUpdateSchedules(
      [e1.id, e2.id],
      "mark_completed",
    );
    expect(results.length).toBe(2);
    expect(results.every((r) => r.status === "completed")).toBe(true);
  });
});
