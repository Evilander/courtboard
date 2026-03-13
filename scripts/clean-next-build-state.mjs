import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, ".next"),
  path.join(root, "tsconfig.tsbuildinfo"),
];

await Promise.all(
  targets.map(async (target) => {
    await fs.rm(target, { force: true, recursive: true }).catch(() => {});
  }),
);
