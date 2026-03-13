import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { createScreen, listScreens } from "@/lib/data/screens";
import { screenSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ screens: listScreens() });
}

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = screenSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const screen = createScreen({
    ...parsed.data,
    locationDescription: parsed.data.locationDescription ?? null,
  });

  writeAuditLog({
    userId: user.id,
    action: "screen.create",
    entityType: "screen",
    entityId: screen.id,
    details: parsed.data,
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "screen.updated" });

  return NextResponse.json({ screen }, { status: 201 });
}
