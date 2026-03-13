import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function resolveDatabasePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      `CourtBoard only supports SQLite file URLs. Received: ${databaseUrl}`,
    );
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/courtboard.db";
const databasePath = resolveDatabasePath(databaseUrl);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

migrate(db, {
  migrationsFolder: path.resolve(process.cwd(), "drizzle"),
});

sqlite.close();
console.log(`Applied migrations to ${databasePath}`);
