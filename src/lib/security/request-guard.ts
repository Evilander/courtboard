import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAuthRateLimitMaxAttempts,
  getAuthRateLimitWindowSeconds,
} from "@/lib/env";
import { getIpFromHeaders } from "@/lib/request/ip";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  isMutatingMethod,
  requiresCsrfValidation,
} from "./csrf";
import { isAdminApiPath, isAdminPagePath } from "./routes";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __courtboardRateLimitStore?: Map<string, RateLimitEntry>;
};

function getRateLimitStore() {
  if (!globalForRateLimit.__courtboardRateLimitStore) {
    globalForRateLimit.__courtboardRateLimitStore = new Map();
  }

  return globalForRateLimit.__courtboardRateLimitStore;
}

function getRateLimitResponse(
  request: NextRequest,
  limit: number,
  windowSeconds: number,
  scope: string,
) {
  const store = getRateLimitStore();
  const now = Date.now();
  const ipAddress = getIpFromHeaders(request.headers) ?? "unknown";
  const key = `${scope}:${ipAddress}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    const isApiRequest =
      request.nextUrl.pathname.startsWith("/api/") ||
      request.headers.get("accept")?.includes("application/json");

    return isApiRequest
      ? NextResponse.json(
          {
            error: "Too Many Requests",
            retryAfter,
          },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          },
        )
      : new NextResponse("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        });
  }

  existing.count += 1;
  store.set(key, existing);
  return null;
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
    ].join("; "),
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

function ensureCsrfCookie(response: NextResponse, request: NextRequest) {
  if (request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    return;
  }

  if (
    isMutatingMethod(request.method) ||
    (!isAdminPagePath(request.nextUrl.pathname) &&
      request.nextUrl.pathname !== "/login")
  ) {
    return;
  }

  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: crypto.randomUUID().replace(/-/g, ""),
    httpOnly: false,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
  });
}

function validateSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return false;
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const expectedOrigin = `${protocol}://${host}`;

  return origin === expectedOrigin;
}

function validateCsrf(request: NextRequest) {
  if (!isMutatingMethod(request.method)) {
    return null;
  }

  if (!requiresCsrfValidation(request.nextUrl.pathname)) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  if (!validateSameOrigin(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  return null;
}

export function guardRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/auth/") || pathname === "/login") {
    return getRateLimitResponse(
      request,
      getAuthRateLimitMaxAttempts(),
      getAuthRateLimitWindowSeconds(),
      "auth",
    );
  }

  if (isAdminApiPath(pathname) && isMutatingMethod(request.method)) {
    return (
      getRateLimitResponse(request, 60, 60, "admin-api") ?? validateCsrf(request)
    );
  }

  return null;
}

export function finalizeResponse(response: NextResponse, request: NextRequest) {
  applySecurityHeaders(response, request);
  ensureCsrfCookie(response, request);
  return response;
}
