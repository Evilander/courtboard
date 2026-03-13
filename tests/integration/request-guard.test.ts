import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { guardRequest, resetRateLimitStore } from "@/lib/security/request-guard";

describe("request guard", () => {
  beforeEach(() => {
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "1";
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = "60";
    resetRateLimitStore();
  });

  it("does not rate limit repeated GET requests to the login page", () => {
    const first = guardRequest(new NextRequest("http://localhost/login"));
    const second = guardRequest(new NextRequest("http://localhost/login"));

    expect(first).toBeNull();
    expect(second).toBeNull();
  });

  it("rate limits repeated credential callback POST requests", () => {
    const url = "http://localhost/api/auth/callback/credentials";

    const first = guardRequest(
      new NextRequest(url, { method: "POST", headers: { origin: "http://localhost" } }),
    );
    const second = guardRequest(
      new NextRequest(url, { method: "POST", headers: { origin: "http://localhost" } }),
    );

    expect(first).toBeNull();
    expect(second?.status).toBe(429);
  });
});
