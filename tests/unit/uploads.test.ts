import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UploadValidationError, saveUploadedImage } from "@/lib/uploads";

describe("upload validation", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalUploadMaxBytes = process.env.UPLOAD_MAX_BYTES;

  beforeEach(() => {
    process.env.AUTH_SECRET = "courtboard-test-secret-01234567890123456789";
  });

  afterEach(() => {
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }

    if (originalUploadMaxBytes === undefined) {
      delete process.env.UPLOAD_MAX_BYTES;
    } else {
      process.env.UPLOAD_MAX_BYTES = originalUploadMaxBytes;
    }
  });

  it("rejects unsupported MIME types before image processing", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "notes.txt", {
      type: "text/plain",
    });

    await expect(saveUploadedImage(file)).rejects.toBeInstanceOf(UploadValidationError);
    await expect(saveUploadedImage(file)).rejects.toThrow(/accepts/i);
  });

  it("rejects files larger than the configured upload limit", async () => {
    process.env.UPLOAD_MAX_BYTES = "16";
    const file = new File([new Uint8Array(64)], "oversize.png", {
      type: "image/png",
    });

    await expect(saveUploadedImage(file)).rejects.toBeInstanceOf(UploadValidationError);
    await expect(saveUploadedImage(file)).rejects.toThrow(/limit/i);
  });
});
