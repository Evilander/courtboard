import type {
  auditLogs,
  contentItems,
  scheduleEntries,
  screens,
  users,
} from "@/lib/db/schema";
import { isScreenOnline } from "@/lib/time";

export type ScreenRecord = typeof screens.$inferSelect;
export type ScheduleRecord = typeof scheduleEntries.$inferSelect;
export type ContentRecord = typeof contentItems.$inferSelect;
export type UserSelectRecord = typeof users.$inferSelect;
export type AuditRecord = typeof auditLogs.$inferSelect;

export function serializeScreen(screen: ScreenRecord) {
  return {
    ...screen,
    createdAt: screen.createdAt?.toISOString() ?? null,
    updatedAt: screen.updatedAt?.toISOString() ?? null,
    lastSeenAt: screen.lastSeenAt?.toISOString() ?? null,
    online: isScreenOnline(screen.lastSeenAt),
  };
}

export type SerializedScreen = ReturnType<typeof serializeScreen>;

export function serializeSchedule(entry: ScheduleRecord) {
  return {
    ...entry,
    createdAt: entry.createdAt?.toISOString() ?? null,
    updatedAt: entry.updatedAt?.toISOString() ?? null,
  };
}

export type SerializedSchedule = ReturnType<typeof serializeSchedule>;

export function serializeContent(item: ContentRecord) {
  return {
    ...item,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    startsAt: item.startsAt?.toISOString() ?? null,
    expiresAt: item.expiresAt?.toISOString() ?? null,
  };
}

export type SerializedContent = ReturnType<typeof serializeContent>;

export function serializeUser(user: UserSelectRecord) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    totpEnabled: user.totpEnabled,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    failedAttempts: user.failedAttempts,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    createdAt: user.createdAt?.toISOString() ?? null,
    updatedAt: user.updatedAt?.toISOString() ?? null,
  };
}

export type SerializedUser = ReturnType<typeof serializeUser>;

export function serializeAudit(
  audit: AuditRecord & { username?: string | null; userRole?: string | null },
) {
  return {
    ...audit,
    createdAt: audit.createdAt?.toISOString() ?? null,
    username: audit.username ?? null,
    userRole: audit.userRole ?? null,
  };
}

export type SerializedAudit = ReturnType<typeof serializeAudit>;
