import { beforeEach, describe, expect, it } from "vitest";
import { saveUploadedImage, UploadValidationError } from "@/lib/uploads";

describe("uploads", () => {
  beforeEach(() => {
    process.env.UPLOAD_MAX_BYTES = "1024";
  });

  it("rejects unsupported file types before processing", async () => {
    const file = new File([Buffer.from("hello")], "notes.txt", {
      type: "text/plain",
    });

    await expect(saveUploadedImage(file)).rejects.toBeInstanceOf(
      UploadValidationError,
    );
  });

  it("rejects oversized images before writing to disk", async () => {
    const file = new File([Buffer.alloc(2048, 1)], "large.png", {
      type: "image/png",
    });

    await expect(saveUploadedImage(file)).rejects.toBeInstanceOf(
      UploadValidationError,
    );
  });
});
