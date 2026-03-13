import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  contentItems,
  scheduleEntries,
  screens,
  users,
} from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const userTotal = db.select({ total: count() }).from(users).get()?.total ?? 0;
  const screenTotal =
    db.select({ total: count() }).from(screens).get()?.total ?? 0;
  const scheduleTotal =
    db.select({ total: count() }).from(scheduleEntries).get()?.total ?? 0;
  const contentTotal =
    db.select({ total: count() }).from(contentItems).get()?.total ?? 0;

  return NextResponse.json({
    ok: true,
    service: "courtboard",
    timestamp: new Date().toISOString(),
    totals: {
      users: userTotal,
      screens: screenTotal,
      scheduleEntries: scheduleTotal,
      contentItems: contentTotal,
    },
  });
}
