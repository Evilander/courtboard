import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { serializeUser } from "@/lib/serializers";
import { createTotpSetup } from "@/lib/auth/totp";
import { hashPassword } from "@/lib/auth/password";

export function countAdmins(): number {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();
  return result?.count ?? 0;
}

export async function listUsers() {
  const rows = db.select().from(users).orderBy(asc(users.username)).all();
  return rows.map(serializeUser);
}

export async function createUser(values: {
  username: string;
  email: string;
  name: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  totpEnabled?: boolean;
}) {
  const passwordHash = await hashPassword(values.password);
  const normalizedUsername = values.username.trim().toLowerCase();
  const totp = values.totpEnabled ? createTotpSetup(normalizedUsername) : null;

  const row = db
    .insert(users)
    .values({
      username: normalizedUsername,
      email: values.email.trim().toLowerCase(),
      name: values.name.trim(),
      passwordHash,
      role: values.role,
      totpEnabled: Boolean(values.totpEnabled),
      totpSecret: totp?.secret ?? null,
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return {
    user: serializeUser(row),
    totpSecret: totp?.secret ?? null,
    totpUri: totp?.uri ?? null,
  };
}

export async function updateUser(
  id: string,
  values: {
    name?: string;
    email?: string;
    role?: "admin" | "editor" | "viewer";
    password?: string;
    totpEnabled?: boolean;
    resetTotp?: boolean;
  },
) {
  const current = db.select().from(users).where(eq(users.id, id)).get() ?? null;
  if (!current) {
    return null;
  }

  let passwordHash: string | undefined;
  if (values.password) {
    passwordHash = await hashPassword(values.password);
  }

  let nextSecret = current.totpSecret;
  let totpUri: string | null = null;
  if (values.totpEnabled === false) {
    nextSecret = null;
    totpUri = null;
  } else if (values.resetTotp || (values.totpEnabled && !current.totpSecret)) {
    const totp = createTotpSetup(current.username);
    nextSecret = totp.secret;
    totpUri = totp.uri;
  }

  const row = db
    .update(users)
    .set({
      name: values.name?.trim() ?? current.name,
      email: values.email?.trim().toLowerCase() ?? current.email,
      role: values.role ?? current.role,
      passwordHash: passwordHash ?? current.passwordHash,
      totpEnabled: values.totpEnabled ?? current.totpEnabled,
      totpSecret: nextSecret,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
    .get();

  return row
    ? {
        user: serializeUser(row),
        totpSecret: row.totpEnabled ? nextSecret ?? null : null,
        totpUri,
      }
    : null;
}
