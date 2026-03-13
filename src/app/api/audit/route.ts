import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/data/audit-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = await requireRouteUser("admin");
  if (response) {
    return response;
  }

  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const audit = listAuditLogs({
    action: url.searchParams.get("action") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 25,
  });

  return NextResponse.json(audit);
}
