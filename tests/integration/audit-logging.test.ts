import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase } from "./helpers/test-db";

const TEST_USER_ID = "audit-test-user-1";

describe("Audit Logging", () => {
  let db: ReturnType<typeof setupTestDatabase>["db"];

  beforeAll(async () => {
    const result = setupTestDatabase();
    db = result.db;

    // Seed a real user so FK constraints pass
    const { hashPassword } = await import("@/lib/auth/password");
    const { users } = await import("@/lib/db/schema");
    const hash = await hashPassword("TestPassword123!");
    db.insert(users)
      .values({
        id: TEST_USER_ID,
        username: "audituser",
        email: "audit@courtboard.local",
        name: "Audit Test User",
        passwordHash: hash,
        role: "admin",
        totpEnabled: false,
      })
      .run();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it("writes audit log entries with all fields", async () => {
    const { writeAuditLog } = await import("@/lib/audit");
    const { auditLogs } = await import("@/lib/db/schema");

    writeAuditLog({
      userId: TEST_USER_ID,
      action: "schedule.create",
      entityType: "schedule_entry",
      entityId: "entry-456",
      details: { caseNumber: "2026-CF-001", courtroom: "Room 3" },
      ipAddress: "10.0.1.50",
    });

    const logs = db.select().from(auditLogs).all();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const lastLog = logs[logs.length - 1];
    expect(lastLog.userId).toBe(TEST_USER_ID);
    expect(lastLog.action).toBe("schedule.create");
    expect(lastLog.entityType).toBe("schedule_entry");
    expect(lastLog.entityId).toBe("entry-456");
    expect(lastLog.ipAddress).toBe("10.0.1.50");
    expect(lastLog.details).toBeDefined();
    expect((lastLog.details as Record<string, unknown>).caseNumber).toBe(
      "2026-CF-001",
    );
  });

  it("logs actions without a user (system events)", async () => {
    const { writeAuditLog } = await import("@/lib/audit");
    const { auditLogs } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    writeAuditLog({
      action: "system.startup",
      entityType: "system",
      details: { version: "0.1.0" },
    });

    const systemLogs = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "system.startup"))
      .all();

    expect(systemLogs.length).toBeGreaterThanOrEqual(1);
    expect(systemLogs[0].userId).toBeNull();
  });

  it("stores JSON details correctly", async () => {
    const { writeAuditLog } = await import("@/lib/audit");
    const { auditLogs } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const complexDetails = {
      ids: ["a", "b", "c"],
      action: "mark_completed",
      affectedCount: 3,
      nested: { key: "value" },
    };

    writeAuditLog({
      userId: TEST_USER_ID,
      action: "schedule.bulk.mark_completed",
      entityType: "schedule_entry",
      details: complexDetails,
    });

    const logs = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "schedule.bulk.mark_completed"))
      .all();

    const detail = logs[0].details as Record<string, unknown>;
    expect(detail.affectedCount).toBe(3);
    expect((detail.ids as string[]).length).toBe(3);
  });
});
