import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { readJsonBody } from "@/lib/api/request";
import { createUser, listUsers } from "@/lib/data/users";
import { userCreateSchema } from "@/lib/validation";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { badRequest, validationErrorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireRouteUser("admin");
  if (response) {
    return response;
  }

  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("admin");
  if (response || !user) {
    return response;
  }

  const { data: json, response: invalidJsonResponse } = await readJsonBody(request);
  if (invalidJsonResponse) {
    return invalidJsonResponse;
  }

  const parsed = userCreateSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const created = await createUser(parsed.data);

    writeAuditLog({
      userId: user.id,
      action: "user.create",
      entityType: "user",
      entityId: created.user.id,
      details: {
        username: created.user.username,
        role: created.user.role,
        totpEnabled: created.user.totpEnabled,
      },
      ipAddress: getIpFromHeaders(new Headers(request.headers)),
    });

    emitDisplayUpdate({ type: "user.updated" });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) {
      return badRequest("A user with that username or email already exists.");
    }

    throw error;
  }
}
