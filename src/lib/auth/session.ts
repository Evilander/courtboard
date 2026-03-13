import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

export async function requireRouteUser(requiredRole: UserRole = "viewer") {
  const session = await auth();

  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  if (!hasRequiredRole(session.user.role, requiredRole)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  return {
    response: null,
    user: session.user,
  };
}
