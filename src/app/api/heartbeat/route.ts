import { NextResponse } from "next/server";
import { touchScreenHeartbeat } from "@/lib/data/screens";
import { heartbeatSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = heartbeatSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const screen = touchScreenHeartbeat(parsed.data.slug);
  if (!screen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  emitDisplayUpdate({
    type: "heartbeat.updated",
    screenSlugs: [screen.slug],
    zones: [screen.zone],
  });

  return NextResponse.json({ ok: true, screen });
}
