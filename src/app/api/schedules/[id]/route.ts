import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import {
  deleteScheduleEntry,
  getScheduleEntryById,
  updateScheduleEntry,
} from "@/lib/data/schedules";
import { scheduleEntrySchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const entry = getScheduleEntryById(params.id);
  if (!entry) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = scheduleEntrySchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const entry = updateScheduleEntry(params.id, {
    ...parsed.data,
    screenId: parsed.data.screenId || null,
    estimatedDuration: parsed.data.estimatedDuration ?? null,
  });

  if (!entry) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "schedule.update",
    entityType: "schedule_entry",
    entityId: entry.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "schedule.updated" });

  return NextResponse.json({ entry });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const entry = deleteScheduleEntry(params.id);
  if (!entry) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "schedule.delete",
    entityType: "schedule_entry",
    entityId: entry.id,
    details: entry,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "schedule.updated" });

  return NextResponse.json({ entry });
}
