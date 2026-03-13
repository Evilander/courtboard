import { count } from "drizzle-orm";
import { db, databasePath, sqlite } from "@/lib/db";
import {
  contentItems,
  scheduleEntries,
  screens,
  users,
} from "@/lib/db/schema";
import {
  getAccountLockoutMinutes,
  getAuthRateLimitMaxAttempts,
  getAuthRateLimitWindowSeconds,
  getAuthUrl,
  getCourthouseName,
  getIdleTimeoutMinutes,
  getSessionMaxAgeSeconds,
} from "@/lib/env";
import { isScreenOnline } from "@/lib/time";

const processStartedAt = Date.now();

function getRecordTotals() {
  const userTotal = db.select({ total: count() }).from(users).get()?.total ?? 0;
  const screenTotal =
    db.select({ total: count() }).from(screens).get()?.total ?? 0;
  const scheduleTotal =
    db.select({ total: count() }).from(scheduleEntries).get()?.total ?? 0;
  const contentTotal =
    db.select({ total: count() }).from(contentItems).get()?.total ?? 0;

  return {
    users: userTotal,
    screens: screenTotal,
    scheduleEntries: scheduleTotal,
    contentItems: contentTotal,
  };
}

function getOnlineScreenTotal() {
  return db
    .select({ lastSeenAt: screens.lastSeenAt })
    .from(screens)
    .all()
    .filter((screen) => isScreenOnline(screen.lastSeenAt)).length;
}

function getUptimeSeconds() {
  return Math.floor((Date.now() - processStartedAt) / 1000);
}

export function getRuntimeStatus() {
  sqlite.prepare("select 1").get();

  const totals = getRecordTotals();
  const onlineScreens = getOnlineScreenTotal();

  return {
    ok: true,
    service: "courtboard",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    courthouseName: getCourthouseName(),
    authUrl: getAuthUrl(),
    database: {
      file: databasePath.split(/[\\/]/).pop() ?? databasePath,
      mode: "sqlite-wal",
    },
    uptimeSeconds: getUptimeSeconds(),
    totals,
    screens: {
      online: onlineScreens,
      offline: Math.max(0, totals.screens - onlineScreens),
      total: totals.screens,
    },
    auth: {
      sessionMaxAgeSeconds: getSessionMaxAgeSeconds(),
      idleTimeoutMinutes: getIdleTimeoutMinutes(),
      accountLockoutMinutes: getAccountLockoutMinutes(),
      rateLimitWindowSeconds: getAuthRateLimitWindowSeconds(),
      rateLimitMaxAttempts: getAuthRateLimitMaxAttempts(),
    },
  };
}

export function getReadinessStatus() {
  try {
    const status = getRuntimeStatus();

    return {
      ok: true,
      service: status.service,
      timestamp: status.timestamp,
      checks: {
        database: "ok",
        auth: "ok",
        runtime: "ok",
      },
    };
  } catch (error) {
    return {
      ok: false,
      service: "courtboard",
      timestamp: new Date().toISOString(),
      checks: {
        database: "error",
        auth: "unknown",
        runtime: "error",
      },
      error: error instanceof Error ? error.message : "Readiness check failed.",
    };
  }
}
