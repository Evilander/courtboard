import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { resolveFromRuntimeRoot } from "@/lib/env";

const uploadDirectory = resolveFromRuntimeRoot("public", "uploads");

export async function saveUploadedImage(file: File) {
  await fs.mkdir(uploadDirectory, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}.webp`;
  const outputPath = path.join(uploadDirectory, filename);

  await sharp(bytes)
    .rotate()
    .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(outputPath);

  return `/uploads/${filename}`;
}
