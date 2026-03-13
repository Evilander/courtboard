import { and, asc, desc, eq, or, isNull, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentItems,
  type ContentType,
  type ContentZoneFilter,
} from "@/lib/db/schema";
import { serializeContent } from "@/lib/serializers";

export function listContentItems(filters?: {
  zone?: ContentZoneFilter | "all";
  type?: ContentType;
}) {
  const where = [];

  if (filters?.zone && filters.zone !== "all") {
    where.push(eq(contentItems.zoneFilter, filters.zone));
  }

  if (filters?.type) {
    where.push(eq(contentItems.type, filters.type));
  }

  const rows = db
    .select()
    .from(contentItems)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(contentItems.displayOrder), desc(contentItems.createdAt))
    .all();

  return rows.map(serializeContent);
}

export function getContentItemById(id: string) {
  const row =
    db.select().from(contentItems).where(eq(contentItems.id, id)).get() ?? null;

  return row ? serializeContent(row) : null;
}

export function listActiveContentForZone(zone: ContentZoneFilter) {
  const now = new Date();
  const where = [];

  if (zone !== "all") {
    where.push(
      or(eq(contentItems.zoneFilter, "all"), eq(contentItems.zoneFilter, zone))!,
    );
  }
  where.push(or(isNull(contentItems.startsAt), lte(contentItems.startsAt, now))!);
  where.push(or(isNull(contentItems.expiresAt), gte(contentItems.expiresAt, now))!);

  const rows = db
    .select()
    .from(contentItems)
    .where(and(...where))
    .orderBy(asc(contentItems.displayOrder), desc(contentItems.createdAt))
    .all();

  return rows.map(serializeContent);
}

export function createContentItem(values: typeof contentItems.$inferInsert) {
  const row = db
    .insert(contentItems)
    .values({
      ...values,
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return serializeContent(row);
}

export function updateContentItem(
  id: string,
  values: Partial<typeof contentItems.$inferInsert>,
) {
  const row = db
    .update(contentItems)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(contentItems.id, id))
    .returning()
    .get();

  return row ? serializeContent(row) : null;
}

export function deleteContentItem(id: string) {
  const row = db
    .delete(contentItems)
    .where(eq(contentItems.id, id))
    .returning()
    .get();

  return row ? serializeContent(row) : null;
}

export function clearEmergencyAlerts(zone?: ContentZoneFilter | "all") {
  const where = [eq(contentItems.isEmergency, true)];
  if (zone && zone !== "all") {
    where.push(eq(contentItems.zoneFilter, zone));
  }

  const rows = db
    .delete(contentItems)
    .where(and(...where))
    .returning()
    .all();

  return rows.map(serializeContent);
}
