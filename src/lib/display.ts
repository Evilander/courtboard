import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scheduleEntries } from "@/lib/db/schema";
import { getCourthouseName } from "@/lib/env";
import { serializeSchedule, serializeScreen } from "@/lib/serializers";
import { getRawScreenBySlug } from "@/lib/data/screens";
import { listActiveContentForZone } from "@/lib/data/content";
import { slugifyValue, toDateKey } from "@/lib/time";

export type DisplayPayload = {
  courthouseName: string;
  today: string;
  screen: ReturnType<typeof serializeScreen>;
  schedules: Array<ReturnType<typeof serializeSchedule>>;
  contentItems: ReturnType<typeof listActiveContentForZone>;
  emergency: ReturnType<typeof listActiveContentForZone>[number] | null;
  judgeNames: string[];
};

export function getDisplayPayload(slug: string) {
  const screen = getRawScreenBySlug(slug);
  if (!screen) {
    return null;
  }

  const today = toDateKey();
  const allTodaySchedules = db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.date, today))
    .orderBy(asc(scheduleEntries.scheduledTime))
    .all();

  const content = listActiveContentForZone(screen.zone);
  const emergency = content.find((item) => item.isEmergency) ?? null;
  const regularContent = content.filter((item) => !item.isEmergency);

  const schedulesForScreen =
    screen.zone === "lobby"
      ? allTodaySchedules
      : screen.zone === "courtroom"
        ? allTodaySchedules.filter((entry) => {
            const directMatch = entry.screenId === screen.id;
            const courtroomMatch =
              !entry.screenId &&
              slugifyValue(entry.courtroom) === slugifyValue(screen.slug);
            return directMatch || courtroomMatch;
          })
        : [];

  const judgeNames = Array.from(
    new Set(schedulesForScreen.map((entry) => entry.judgeName).filter(Boolean)),
  );

  return {
    courthouseName: getCourthouseName(),
    today,
    screen: serializeScreen(screen),
    schedules: schedulesForScreen.map(serializeSchedule),
    contentItems: regularContent,
    emergency,
    judgeNames,
  } satisfies DisplayPayload;
}
