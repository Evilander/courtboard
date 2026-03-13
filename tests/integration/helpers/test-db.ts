import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as typeof globalThis & {
  __courtboardSqlite?: Database.Database;
  __courtboardDb?: ReturnType<typeof drizzle>;
};

let testDbPath: string;

export function setupTestDatabase() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "courtboard-test-"));
  testDbPath = path.join(tmpDir, "test.db");

  const sqlite = new Database(testDbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  const migrationsPath = path.resolve(process.cwd(), "drizzle");
  migrate(db, { migrationsFolder: migrationsPath });

  // Override the global singleton so all imports of db use this test instance
  globalForDb.__courtboardSqlite = sqlite;
  globalForDb.__courtboardDb = db;

  return { db, sqlite };
}

export function teardownTestDatabase() {
  const sqlite = globalForDb.__courtboardSqlite;
  if (sqlite && !sqlite.open) return;
  if (sqlite) {
    sqlite.close();
  }
  if (testDbPath && fs.existsSync(testDbPath)) {
    const dir = path.dirname(testDbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
