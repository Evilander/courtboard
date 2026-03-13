import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/api/request";

describe("readJsonBody", () => {
  it("parses valid JSON payloads", async () => {
    const request = new Request("http://courtboard.test/api/example", {
      body: JSON.stringify({ ok: true }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const result = await readJsonBody(request);

    expect(result.response).toBeNull();
    expect(result.data).toEqual({ ok: true });
  });

  it("returns a bad request response for invalid JSON", async () => {
    const request = new Request("http://courtboard.test/api/example", {
      body: "{",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const result = await readJsonBody(request);

    expect(result.data).toBeNull();
    expect(result.response?.status).toBe(400);
    await expect(result.response?.json()).resolves.toEqual({
      error: "Invalid JSON body.",
    });
  });
});
