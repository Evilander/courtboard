import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { createContentItem, clearEmergencyAlerts } from "@/lib/data/content";
import { alertSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = alertSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const alert = createContentItem({
    type: "announcement",
    title: parsed.data.message,
    body: parsed.data.message,
    imagePath: null,
    displayOrder: 0,
    zoneFilter: parsed.data.zone,
    startsAt: new Date(),
    expiresAt: null,
    isEmergency: true,
  });

  writeAuditLog({
    userId: user.id,
    action: "alert.activate",
    entityType: "content_item",
    entityId: alert.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({
    type: "alert.updated",
    zones: parsed.data.zone === "all" ? undefined : [parsed.data.zone],
  });

  return NextResponse.json({ alert }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const url = new URL(request.url);
  const zone = url.searchParams.get("zone") as "all" | "lobby" | "courtroom" | "info" | null;
  const cleared = clearEmergencyAlerts(zone ?? "all");

  writeAuditLog({
    userId: user.id,
    action: "alert.clear",
    entityType: "content_item",
    entityId: null,
    details: { zone: zone ?? "all", cleared: cleared.length },
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({
    type: "alert.updated",
    zones: zone && zone !== "all" ? [zone] : undefined,
  });

  return NextResponse.json({ cleared });
}
