import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export const SCREEN_ZONES = ["lobby", "courtroom", "info"] as const;
export const SCHEDULE_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "continued",
  "cancelled",
] as const;
export const CONTENT_TYPES = ["announcement", "image", "html"] as const;
export const CONTENT_ZONE_FILTERS = ["all", ...SCREEN_ZONES] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type ScreenZone = (typeof SCREEN_ZONES)[number];
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentZoneFilter = (typeof CONTENT_ZONE_FILTERS)[number];

const nowExpression = sql`(unixepoch() * 1000)`;

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLES }).$type<UserRole>().notNull(),
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
});

export const screens = sqliteTable("screens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  zone: text("zone", { enum: SCREEN_ZONES }).$type<ScreenZone>().notNull(),
  locationDescription: text("location_description"),
  rotationIntervalSeconds: integer("rotation_interval_seconds")
    .notNull()
    .default(15),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
});

export const scheduleEntries = sqliteTable("schedule_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  screenId: text("screen_id").references(() => screens.id, {
    onDelete: "set null",
  }),
  caseNumber: text("case_number").notNull(),
  caseTitle: text("case_title").notNull(),
  caseType: text("case_type").notNull(),
  judgeName: text("judge_name").notNull(),
  courtroom: text("courtroom").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  estimatedDuration: integer("estimated_duration"),
  status: text("status", { enum: SCHEDULE_STATUSES })
    .$type<ScheduleStatus>()
    .notNull()
    .default("scheduled"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
});

export const contentItems = sqliteTable("content_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type", { enum: CONTENT_TYPES }).$type<ContentType>().notNull(),
  title: text("title").notNull(),
  body: text("body"),
  imagePath: text("image_path"),
  displayOrder: integer("display_order").notNull().default(0),
  zoneFilter: text("zone_filter", { enum: CONTENT_ZONE_FILTERS })
    .$type<ContentZoneFilter>()
    .notNull()
    .default("all"),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  isEmergency: integer("is_emergency", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details", { mode: "json" }).$type<Record<string, unknown> | null>(),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(nowExpression),
});

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  }),
);

export const authSessions = sqliteTable("auth_sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const authVerificationTokens = sqliteTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.identifier, table.token],
    }),
  }),
);

export const authAuthenticators = sqliteTable(
  "auth_authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: integer("credential_backed_up", {
      mode: "boolean",
    }).notNull(),
    transports: text("transports"),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.userId, table.credentialID],
    }),
  }),
);

export type UserRecord = typeof users.$inferSelect;
