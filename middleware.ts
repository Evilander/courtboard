import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import {
  finalizeResponse,
  guardRequest,
} from "@/lib/security/request-guard";
import { isAdminApiPath, isAdminPagePath } from "@/lib/security/routes";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const blockedResponse = guardRequest(request);
  if (blockedResponse) {
    return finalizeResponse(blockedResponse, request);
  }

  const pathname = request.nextUrl.pathname;
  if (!request.auth?.user && isAdminApiPath(pathname)) {
    return finalizeResponse(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  if (!request.auth?.user && isAdminPagePath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/login";
    signInUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return finalizeResponse(NextResponse.redirect(signInUrl), request);
  }

  return finalizeResponse(NextResponse.next(), request);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
