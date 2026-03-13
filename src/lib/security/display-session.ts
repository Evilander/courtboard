import type { NextRequest, NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/env";

export const DISPLAY_SESSION_COOKIE_NAME = "courtboard.display";

const DISPLAY_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type DisplaySessionPayload = {
  exp: number;
  slug: string;
};

function encodeBase64Url(bytes: Uint8Array) {
  const binary = bytes.reduce(
    (value, byte) => value + String.fromCharCode(byte),
    "",
  );
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

export function getDisplaySlugFromPath(pathname: string) {
  const match = pathname.match(/^\/display\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createDisplaySessionToken(
  slug: string,
  expiresAt = Date.now() + DISPLAY_SESSION_MAX_AGE_SECONDS * 1000,
) {
  const payload = encodeBase64Url(
    encoder.encode(JSON.stringify({ exp: expiresAt, slug } satisfies DisplaySessionPayload)),
  );
  const signature = await signValue(payload);
  return `${payload}.${signature}`;
}

export async function verifyDisplaySessionToken(
  token: string | undefined,
  expectedSlug: string,
) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signValue(payload);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      decoder.decode(decodeBase64Url(payload)),
    ) as DisplaySessionPayload;

    return parsed.slug === expectedSlug && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function ensureDisplaySessionCookie(
  response: NextResponse,
  request: NextRequest,
  slug: string,
) {
  const existingToken = request.cookies.get(DISPLAY_SESSION_COOKIE_NAME)?.value;
  if (await verifyDisplaySessionToken(existingToken, slug)) {
    return;
  }

  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await createDisplaySessionToken(slug);
  const parts = [
    `${DISPLAY_SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `Max-Age=${DISPLAY_SESSION_MAX_AGE_SECONDS}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (isHttps) {
    parts.push("Secure");
  }
  response.headers.append("Set-Cookie", parts.join("; "));
}
