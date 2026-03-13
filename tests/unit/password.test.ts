import { describe, expect, it } from "vitest";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/auth/password";

describe("password policy", () => {
  it("accepts strong passwords", () => {
    expect(validatePasswordStrength("CourtBoard!Admin123")).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(validatePasswordStrength("courtboard")).toBe(false);
  });

  it("hashes and verifies passwords", async () => {
    const password = "CourtBoard!Admin123";
    const hash = await hashPassword(password);

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
