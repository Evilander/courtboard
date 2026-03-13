import path from "node:path";

const DEFAULT_DATABASE_URL = "file:./data/courtboard.db";
const DEFAULT_AUTH_URL = "http://localhost:3000";
const DEFAULT_COURTHOUSE_NAME = "CourtBoard";

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRuntimeRoot() {
  return path.basename(process.cwd()) === "standalone" &&
    path.basename(path.dirname(process.cwd())) === ".next"
    ? path.resolve(process.cwd(), "..", "..")
    : process.cwd();
}

export function resolveFromRuntimeRoot(...segments: string[]) {
  return path.resolve(getRuntimeRoot(), ...segments);
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

export function getResolvedDatabasePath() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      `CourtBoard only supports SQLite file URLs. Received: ${databaseUrl}`,
    );
  }

  const rawPath = databaseUrl.slice("file:".length);

  return path.isAbsolute(rawPath)
    ? rawPath
    : resolveFromRuntimeRoot(rawPath);
}

export function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() ?? process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET must be set before starting CourtBoard.",
    );
  }

  return secret;
}

export function getAuthUrl() {
  return (
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    DEFAULT_AUTH_URL
  );
}

export function getCourthouseName() {
  return process.env.COURTHOUSE_NAME?.trim() || DEFAULT_COURTHOUSE_NAME;
}

export function getSessionMaxAgeSeconds() {
  return parsePositiveInteger(process.env.SESSION_MAX_AGE_SECONDS, 28_800);
}

export function getIdleTimeoutMinutes() {
  return parsePositiveInteger(process.env.IDLE_TIMEOUT_MINUTES, 15);
}

export function getMaxFailedAttempts() {
  return parsePositiveInteger(process.env.MAX_FAILED_ATTEMPTS, 5);
}

export function getAccountLockoutMinutes() {
  return parsePositiveInteger(process.env.ACCOUNT_LOCKOUT_MINUTES, 15);
}

export function getAuthRateLimitWindowSeconds() {
  return parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, 60);
}

export function getAuthRateLimitMaxAttempts() {
  return parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 10);
}

export function getUploadMaxBytes() {
  return parsePositiveInteger(process.env.UPLOAD_MAX_BYTES, 10 * 1024 * 1024);
}

export function getInitialAdminSeed() {
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD must be set before running the seed script.",
    );
  }

  return {
    username: process.env.INITIAL_ADMIN_USERNAME?.trim() || "admin",
    email:
      process.env.INITIAL_ADMIN_EMAIL?.trim() || "admin@courtboard.local",
    password,
    totpSecret: process.env.INITIAL_ADMIN_TOTP_SECRET?.trim() || null,
  };
}
