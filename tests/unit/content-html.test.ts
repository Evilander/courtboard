import { describe, expect, it } from "vitest";
import { sanitizeContentHtml } from "@/lib/content-html";

describe("content HTML sanitization", () => {
  it("removes script execution from HTML previews", () => {
    const sanitized = sanitizeContentHtml(
      '<h1>County services</h1><script>alert("xss")</script><p>Open today</p>',
    );

    expect(sanitized).toContain("<h1>County services</h1>");
    expect(sanitized).toContain("<p>Open today</p>");
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert(");
  });
});
