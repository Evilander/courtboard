import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import {
  deleteScreen,
  getScreenById,
  updateScreen,
} from "@/lib/data/screens";
import { screenSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const screen = getScreenById(params.id);
  if (!screen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  return NextResponse.json({ screen });
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
  const parsed = screenSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const screen = updateScreen(params.id, {
    ...parsed.data,
    locationDescription: parsed.data.locationDescription ?? null,
  });
  if (!screen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "screen.update",
    entityType: "screen",
    entityId: screen.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "screen.updated" });

  return NextResponse.json({ screen });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const screen = deleteScreen(params.id);
  if (!screen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "screen.delete",
    entityType: "screen",
    entityId: screen.id,
    details: screen,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "screen.updated" });

  return NextResponse.json({ screen });
}
