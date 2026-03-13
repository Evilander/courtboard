import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import {
  deleteContentItem,
  getContentItemById,
  updateContentItem,
} from "@/lib/data/content";
import { contentItemSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const item = getContentItemById(params.id);
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
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
  const parsed = contentItemSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const item = updateContentItem(params.id, {
    ...parsed.data,
    body: parsed.data.body ?? null,
    imagePath: parsed.data.imagePath ?? null,
    startsAt: parsed.data.startsAt,
    expiresAt: parsed.data.expiresAt,
  });

  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "content.update",
    entityType: "content_item",
    entityId: item.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "content.updated" });

  return NextResponse.json({ item });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const item = deleteContentItem(params.id);
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "content.delete",
    entityType: "content_item",
    entityId: item.id,
    details: item,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "content.updated" });

  return NextResponse.json({ item });
}
