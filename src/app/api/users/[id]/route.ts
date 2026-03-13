import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { listUsers, updateUser } from "@/lib/data/users";
import { userUpdateSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { response } = await requireRouteUser("admin");
  if (response) {
    return response;
  }

  const user = (await listUsers()).find((entry) => entry.id === params.id) ?? null;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { response, user } = await requireRouteUser("admin");
  if (response || !user) {
    return response;
  }

  const json = await request.json();
  const parsed = userUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const updated = await updateUser(params.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  writeAuditLog({
    userId: user.id,
    action: "user.update",
    entityType: "user",
    entityId: updated.user.id,
    details: {
      ...parsed.data,
      password: parsed.data.password ? "[redacted]" : undefined,
      hasNewTotpSecret: Boolean(updated.totpSecret),
    },
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "user.updated" });

  return NextResponse.json(updated);
}
