import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLogs, users, type UserRecord } from "@/lib/db/schema";
import {
  getAccountLockoutMinutes,
  getMaxFailedAttempts,
} from "@/lib/env";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import {
  AccountLockedError,
  InvalidCredentialsError,
  InvalidTotpError,
  TotpRequiredError,
} from "./errors";
import { verifyPassword } from "./password";
import { verifyTotpToken } from "./totp";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  totp: z.string().trim().optional().default(""),
});

function toSessionUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    username: user.username,
    mfaEnabled: user.totpEnabled,
  };
}

function recordFailure(
  user: UserRecord,
  ipAddress: string | null,
  reason: string,
) {
  const now = new Date();
  const failedAttempts = user.failedAttempts + 1;
  const lockoutThreshold = getMaxFailedAttempts();
  const lockedUntil =
    failedAttempts >= lockoutThreshold
      ? new Date(now.getTime() + getAccountLockoutMinutes() * 60_000)
      : null;

  db.transaction((tx) => {
    tx.update(users)
      .set({
        failedAttempts,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .run();

    tx.insert(auditLogs)
      .values({
        userId: user.id,
        action: "auth.login.failure",
        entityType: "user",
        entityId: user.id,
        details: {
          reason,
          failedAttempts,
          lockedUntil: lockedUntil?.toISOString() ?? null,
        },
        ipAddress,
      })
      .run();
  });
}

function recordSuccess(user: UserRecord, ipAddress: string | null) {
  const now = new Date();

  db.transaction((tx) => {
    tx.update(users)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .run();

    tx.insert(auditLogs)
      .values({
        userId: user.id,
        action: "auth.login.success",
        entityType: "user",
        entityId: user.id,
        details: {
          role: user.role,
          mfaEnabled: user.totpEnabled,
        },
        ipAddress,
      })
      .run();
  });
}

export async function authenticateUser(
  rawCredentials: Record<string, unknown> | undefined,
  request: Request,
) {
  const parsedCredentials = credentialsSchema.safeParse(rawCredentials);
  const ipAddress = getIpFromHeaders(request.headers);

  if (!parsedCredentials.success) {
    throw new InvalidCredentialsError();
  }

  const username = parsedCredentials.data.username.trim().toLowerCase();
  const password = parsedCredentials.data.password;
  const totp = parsedCredentials.data.totp;

  const user =
    db.select()
      .from(users)
      .where(eq(users.username, username))
      .get() ?? null;

  if (!user) {
    writeAuditLog({
      action: "auth.login.failure",
      entityType: "user",
      entityId: username,
      details: { reason: "unknown_user" },
      ipAddress,
    });
    throw new InvalidCredentialsError();
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    writeAuditLog({
      userId: user.id,
      action: "auth.login.blocked",
      entityType: "user",
      entityId: user.id,
      details: {
        reason: "account_locked",
        lockedUntil: user.lockedUntil.toISOString(),
      },
      ipAddress,
    });
    throw new AccountLockedError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    recordFailure(user, ipAddress, "invalid_password");
    throw new InvalidCredentialsError();
  }

  if (user.totpEnabled) {
    if (!totp) {
      throw new TotpRequiredError();
    }

    if (
      !user.totpSecret ||
      !verifyTotpToken(user.totpSecret, totp, user.username)
    ) {
      recordFailure(user, ipAddress, "invalid_totp");
      throw new InvalidTotpError();
    }
  }

  recordSuccess(user, ipAddress);
  return toSessionUser(user);
}
