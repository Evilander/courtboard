import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getUploadMaxBytes, resolveFromRuntimeRoot } from "@/lib/env";

const uploadDirectory = resolveFromRuntimeRoot("public", "uploads");
const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class UploadValidationError extends Error {}

function formatMaxUploadSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes)
    ? `${megabytes} MB`
    : `${megabytes.toFixed(1)} MB`;
}

export async function saveUploadedImage(file: File) {
  const maxBytes = getUploadMaxBytes();

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError(
      "CourtBoard accepts GIF, JPEG, PNG, and WebP uploads only.",
    );
  }

  if (file.size <= 0) {
    throw new UploadValidationError("Uploaded image is empty.");
  }

  if (file.size > maxBytes) {
    throw new UploadValidationError(
      `Uploaded image exceeds the ${formatMaxUploadSize(maxBytes)} limit.`,
    );
  }

  await fs.mkdir(uploadDirectory, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}.webp`;
  const outputPath = path.join(uploadDirectory, filename);

  try {
    await sharp(bytes)
      .rotate()
      .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(outputPath);
  } catch {
    throw new UploadValidationError(
      "CourtBoard could not process that image. Re-export it as PNG, JPEG, WebP, or GIF and try again.",
    );
  }

  return `/uploads/${filename}`;
}
