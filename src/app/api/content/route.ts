import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { readJsonBody } from "@/lib/api/request";
import {
  createContentItem,
  listContentItems,
} from "@/lib/data/content";
import {
  CONTENT_TYPES,
  CONTENT_ZONE_FILTERS,
  type ContentType,
  type ContentZoneFilter,
} from "@/lib/db/schema";
import { contentItemSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isContentZoneFilter(value: string): value is ContentZoneFilter {
  return CONTENT_ZONE_FILTERS.includes(value as ContentZoneFilter);
}

function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const zoneQuery = url.searchParams.get("zone");
  const typeQuery = url.searchParams.get("type");
  const zone = zoneQuery && isContentZoneFilter(zoneQuery) ? zoneQuery : undefined;
  const type = typeQuery && isContentType(typeQuery) ? typeQuery : undefined;

  const items = listContentItems({
    zone,
    type,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const { data: json, response: invalidJsonResponse } = await readJsonBody(request);
  if (invalidJsonResponse) {
    return invalidJsonResponse;
  }

  const parsed = contentItemSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const item = createContentItem({
    ...parsed.data,
    body: parsed.data.body ?? null,
    imagePath: parsed.data.imagePath ?? null,
    startsAt: parsed.data.startsAt,
    expiresAt: parsed.data.expiresAt,
  });

  writeAuditLog({
    userId: user.id,
    action: "content.create",
    entityType: "content_item",
    entityId: item.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "content.updated" });

  return NextResponse.json({ item }, { status: 201 });
}
