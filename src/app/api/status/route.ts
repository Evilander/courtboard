import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getRuntimeStatus } from "@/lib/runtime-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireRouteUser("viewer");
  if (response) {
    return response;
  }

  try {
    return NextResponse.json(getRuntimeStatus());
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "courtboard",
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "Unable to read runtime status.",
      },
      { status: 503 },
    );
  }
}
