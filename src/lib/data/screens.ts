import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { screens } from "@/lib/db/schema";
import { serializeScreen } from "@/lib/serializers";

export function listScreens() {
  const rows = db.select().from(screens).orderBy(asc(screens.name)).all();
  return rows.map(serializeScreen);
}

export function getScreenById(id: string) {
  const row = db.select().from(screens).where(eq(screens.id, id)).get() ?? null;
  return row ? serializeScreen(row) : null;
}

export function getScreenBySlug(slug: string) {
  const row =
    db.select().from(screens).where(eq(screens.slug, slug)).get() ?? null;
  return row ? serializeScreen(row) : null;
}

export function getRawScreenBySlug(slug: string) {
  return db.select().from(screens).where(eq(screens.slug, slug)).get() ?? null;
}

export function createScreen(values: typeof screens.$inferInsert) {
  const row = db
    .insert(screens)
    .values({
      ...values,
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return serializeScreen(row);
}

export function updateScreen(
  id: string,
  values: Partial<typeof screens.$inferInsert>,
) {
  const row = db
    .update(screens)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(screens.id, id))
    .returning()
    .get();

  return row ? serializeScreen(row) : null;
}

export function deleteScreen(id: string) {
  const row = db
    .delete(screens)
    .where(eq(screens.id, id))
    .returning()
    .get();

  return row ? serializeScreen(row) : null;
}

export function touchScreenHeartbeat(slug: string) {
  const row = db
    .update(screens)
    .set({
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(screens.slug, slug))
    .returning()
    .get();

  return row ? serializeScreen(row) : null;
}
