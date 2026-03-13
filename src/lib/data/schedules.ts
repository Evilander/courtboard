import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { scheduleEntries } from "@/lib/db/schema";
import { serializeSchedule } from "@/lib/serializers";

export function listScheduleEntries(filters?: {
  date?: string;
  courtroom?: string;
  screenId?: string;
}) {
  const where = [];

  if (filters?.date) {
    where.push(eq(scheduleEntries.date, filters.date));
  }

  if (filters?.courtroom) {
    where.push(eq(scheduleEntries.courtroom, filters.courtroom));
  }

  if (filters?.screenId) {
    where.push(eq(scheduleEntries.screenId, filters.screenId));
  }

  const rows = db
    .select()
    .from(scheduleEntries)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(scheduleEntries.date), asc(scheduleEntries.scheduledTime))
    .all();

  return rows.map(serializeSchedule);
}

export function getScheduleEntryById(id: string) {
  const row =
    db.select().from(scheduleEntries).where(eq(scheduleEntries.id, id)).get() ??
    null;

  return row ? serializeSchedule(row) : null;
}

export function createScheduleEntry(
  values: typeof scheduleEntries.$inferInsert,
) {
  const now = new Date();
  const row = db
    .insert(scheduleEntries)
    .values({
      ...values,
      updatedAt: now,
    })
    .returning()
    .get();

  return serializeSchedule(row);
}

export function updateScheduleEntry(
  id: string,
  values: Partial<typeof scheduleEntries.$inferInsert>,
) {
  const row = db
    .update(scheduleEntries)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(scheduleEntries.id, id))
    .returning()
    .get();

  return row ? serializeSchedule(row) : null;
}

export function deleteScheduleEntry(id: string) {
  const row = db
    .delete(scheduleEntries)
    .where(eq(scheduleEntries.id, id))
    .returning()
    .get();

  return row ? serializeSchedule(row) : null;
}

export function bulkUpdateSchedules(ids: string[], action: "mark_completed" | "delete") {
  if (ids.length === 0) {
    return [];
  }

  if (action === "delete") {
    const rows = db
      .delete(scheduleEntries)
      .where(inArray(scheduleEntries.id, ids))
      .returning()
      .all();

    return rows.map(serializeSchedule);
  }

  const rows = db
    .update(scheduleEntries)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(inArray(scheduleEntries.id, ids))
    .returning()
    .all();

  return rows.map(serializeSchedule);
}
