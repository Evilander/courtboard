import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { readJsonBody } from "@/lib/api/request";
import { listUsers, updateUser, countAdmins } from "@/lib/data/users";
import { userUpdateSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { response } = await requireRouteUser("admin");
  if (response) {
    return response;
  }

  const user = (await listUsers()).find((entry) => entry.id === id) ?? null;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { response, user } = await requireRouteUser("admin");
  if (response || !user) {
    return response;
  }

  const { data: json, response: invalidJsonResponse } = await readJsonBody(request);
  if (invalidJsonResponse) {
    return invalidJsonResponse;
  }

  const parsed = userUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const targetUser = (await listUsers()).find((entry) => entry.id === id);
  if (parsed.data.role && parsed.data.role !== "admin" && targetUser?.role === "admin") {
    const adminCount = countAdmins();
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last admin user." },
        { status: 409 },
      );
    }
  }

  const updated = await updateUser(id, parsed.data);
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
