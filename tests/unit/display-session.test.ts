import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDisplaySessionToken,
  getDisplaySlugFromPath,
  verifyDisplaySessionToken,
} from "@/lib/security/display-session";

describe("display session security", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "courtboard-test-secret-01234567890123456789";
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
      return;
    }

    process.env.AUTH_SECRET = originalAuthSecret;
  });

  it("creates and verifies a signed display session token", async () => {
    const token = await createDisplaySessionToken("lobby-main");

    await expect(verifyDisplaySessionToken(token, "lobby-main")).resolves.toBe(true);
    await expect(verifyDisplaySessionToken(token, "courtroom-1")).resolves.toBe(false);
  });

  it("rejects expired or tampered tokens", async () => {
    const expiredToken = await createDisplaySessionToken(
      "lobby-main",
      Date.now() - 60_000,
    );
    const validToken = await createDisplaySessionToken("lobby-main");
    const tamperedToken = `${validToken.slice(0, -1)}x`;

    await expect(verifyDisplaySessionToken(expiredToken, "lobby-main")).resolves.toBe(false);
    await expect(verifyDisplaySessionToken(tamperedToken, "lobby-main")).resolves.toBe(false);
  });

  it("extracts display slugs from public display routes", () => {
    expect(getDisplaySlugFromPath("/display/lobby-main")).toBe("lobby-main");
    expect(getDisplaySlugFromPath("/display/courtroom-1")).toBe("courtroom-1");
    expect(getDisplaySlugFromPath("/dashboard")).toBeNull();
  });
});
