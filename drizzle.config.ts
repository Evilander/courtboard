import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/courtboard.db";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
