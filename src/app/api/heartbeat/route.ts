import { NextResponse, type NextRequest } from "next/server";
import {
  getRawScreenBySlug,
  touchScreenHeartbeat,
} from "@/lib/data/screens";
import { heartbeatSchema } from "@/lib/validation";
import {
  DISPLAY_SESSION_COOKIE_NAME,
  verifyDisplaySessionToken,
} from "@/lib/security/display-session";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const screen = getRawScreenBySlug(parsed.data.slug);
  if (!screen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  const displaySession =
    request.cookies.get(DISPLAY_SESSION_COOKIE_NAME)?.value;

  const validDisplaySession = await verifyDisplaySessionToken(
    displaySession,
    screen.slug,
  );
  if (!validDisplaySession) {
    return NextResponse.json(
      {
        error:
          "Heartbeat requests require a valid display session for this screen.",
      },
      { status: 403 },
    );
  }

  const updatedScreen = touchScreenHeartbeat(screen.slug);
  if (!updatedScreen) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }

  emitDisplayUpdate({
    type: "heartbeat.updated",
    screenSlugs: [updatedScreen.slug],
    zones: [updatedScreen.zone],
  });

  return NextResponse.json({ ok: true, screen: updatedScreen });
}
