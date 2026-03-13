import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import {
  bulkUpdateSchedules,
  createScheduleEntry,
  listScheduleEntries,
} from "@/lib/data/schedules";
import { scheduleBulkSchema, scheduleEntrySchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entries = listScheduleEntries({
    date: url.searchParams.get("date") ?? undefined,
    courtroom: url.searchParams.get("courtroom") ?? undefined,
    screenId: url.searchParams.get("screen") ?? undefined,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = scheduleEntrySchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const entry = createScheduleEntry({
    ...parsed.data,
    screenId: parsed.data.screenId || null,
    estimatedDuration: parsed.data.estimatedDuration ?? null,
  });

  writeAuditLog({
    userId: user.id,
    action: "schedule.create",
    entityType: "schedule_entry",
    entityId: entry.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "schedule.updated" });

  return NextResponse.json({ entry }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = scheduleBulkSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const entries = bulkUpdateSchedules(parsed.data.ids, parsed.data.action);

  writeAuditLog({
    userId: user.id,
    action: `schedule.bulk.${parsed.data.action}`,
    entityType: "schedule_entry",
    entityId: null,
    details: {
      ids: parsed.data.ids,
      action: parsed.data.action,
      affectedCount: entries.length,
    },
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "schedule.updated" });

  return NextResponse.json({ entries });
}
