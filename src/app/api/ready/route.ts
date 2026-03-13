import { NextResponse } from "next/server";
import { getReadinessStatus } from "@/lib/runtime-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const status = getReadinessStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
