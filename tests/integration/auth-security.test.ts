import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDatabase, teardownTestDatabase } from "./helpers/test-db";

describe("Authentication & Security", () => {
  let db: ReturnType<typeof setupTestDatabase>["db"];

  beforeAll(async () => {
    const result = setupTestDatabase();
    db = result.db;

    // Seed a test user
    const { hashPassword } = await import("@/lib/auth/password");
    const { users } = await import("@/lib/db/schema");
    const hash = await hashPassword("TestPassword123!");
    db.insert(users)
      .values({
        id: "test-user-1",
        username: "testadmin",
        email: "test@courtboard.local",
        name: "Test Admin",
        passwordHash: hash,
        role: "admin",
        totpEnabled: false,
      })
      .run();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it("verifies correct password", async () => {
    const { hashPassword, verifyPassword } = await import(
      "@/lib/auth/password"
    );
    const hash = await hashPassword("SecureP@ssw0rd!");
    const result = await verifyPassword("SecureP@ssw0rd!", hash);
    expect(result).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const { hashPassword, verifyPassword } = await import(
      "@/lib/auth/password"
    );
    const hash = await hashPassword("SecureP@ssw0rd!");
    const result = await verifyPassword("WrongPassword!", hash);
    expect(result).toBe(false);
  });

  it("validates password strength requirements", async () => {
    const { validatePasswordStrength } = await import(
      "@/lib/auth/password"
    );

    // Too short
    expect(validatePasswordStrength("Short1!")).toBe(false);
    // No uppercase
    expect(validatePasswordStrength("alllowercase1!")).toBe(false);
    // No lowercase
    expect(validatePasswordStrength("ALLUPPERCASE1!")).toBe(false);
    // No digit
    expect(validatePasswordStrength("NoDigitsHere!!")).toBe(false);
    // No symbol
    expect(validatePasswordStrength("NoSymbols12345")).toBe(false);
    // Valid
    expect(validatePasswordStrength("ValidP@ssw0rd!")).toBe(true);
  });

  it("generates and verifies TOTP tokens", async () => {
    const { createTotpSetup, verifyTotpToken } = await import(
      "@/lib/auth/totp"
    );
    const { secret } = createTotpSetup("testuser");

    // Generate a valid token using the same library
    const OTPAuth = await import("otpauth");
    const totp = new OTPAuth.TOTP({
      issuer: "CourtBoard",
      label: "testuser",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const validToken = totp.generate();

    expect(verifyTotpToken(secret, validToken, "testuser")).toBe(true);
    expect(verifyTotpToken(secret, "000000", "testuser")).toBe(false);
    expect(verifyTotpToken(secret, "not-a-token", "testuser")).toBe(false);
  });

  it("tracks failed login attempts in audit log", async () => {
    const { writeAuditLog } = await import("@/lib/audit");
    const { auditLogs } = await import("@/lib/db/schema");

    writeAuditLog({
      userId: "test-user-1",
      action: "auth.login.failure",
      entityType: "user",
      entityId: "test-user-1",
      details: { reason: "invalid_password" },
      ipAddress: "192.168.1.100",
    });

    const logs = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.login.failure"))
      .all();

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].userId).toBe("test-user-1");
    expect(logs[0].ipAddress).toBe("192.168.1.100");
  });
});
