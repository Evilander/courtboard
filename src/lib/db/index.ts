import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getResolvedDatabasePath } from "@/lib/env";
import * as schema from "./schema";

function createSqliteConnection(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("cache_size = -8000"); // 8 MB
  sqlite.pragma("temp_store = MEMORY");

  return sqlite;
}

function createDrizzleClient(connection: Database.Database) {
  return drizzle(connection, { schema });
}

type CourtBoardDatabase = ReturnType<typeof createDrizzleClient>;

const databasePath = getResolvedDatabasePath();
const globalForDb = globalThis as typeof globalThis & {
  __courtboardSqlite?: Database.Database;
  __courtboardDb?: CourtBoardDatabase;
};

export const sqlite =
  globalForDb.__courtboardSqlite ?? createSqliteConnection(databasePath);
export const db = globalForDb.__courtboardDb ?? createDrizzleClient(sqlite);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__courtboardSqlite = sqlite;
  globalForDb.__courtboardDb = db;
}

export { databasePath };
