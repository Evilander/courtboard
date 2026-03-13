import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  contentItems,
  scheduleEntries,
  screens,
  users,
} from "@/lib/db/schema";
import { getInitialAdminSeed, getCourthouseName } from "@/lib/env";
import {
  PASSWORD_POLICY_HINT,
  hashPassword,
  validatePasswordStrength,
} from "@/lib/auth/password";
import { createTotpSetup } from "@/lib/auth/totp";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function upsertAdminUser() {
  const seed = getInitialAdminSeed();
  if (!validatePasswordStrength(seed.password)) {
    throw new Error(
      `INITIAL_ADMIN_PASSWORD does not meet the password policy. ${PASSWORD_POLICY_HINT}`,
    );
  }

  const username = normalizeUsername(seed.username);
  const totp = seed.totpSecret
    ? { secret: seed.totpSecret, uri: null }
    : createTotpSetup(username);
  const passwordHash = await hashPassword(seed.password);
  const now = new Date();

  db.insert(users)
    .values({
      username,
      email: seed.email.toLowerCase(),
      name: "CourtBoard Administrator",
      passwordHash,
      role: "admin",
      totpSecret: totp.secret,
      totpEnabled: true,
      emailVerified: now,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        email: seed.email.toLowerCase(),
        name: "CourtBoard Administrator",
        passwordHash,
        role: "admin",
        totpSecret: totp.secret,
        totpEnabled: true,
        emailVerified: now,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      },
    })
    .run();

  const admin =
    db.select()
      .from(users)
      .where(eq(users.username, username))
      .get() ?? null;

  if (!admin) {
    throw new Error("Failed to create the initial admin user.");
  }

  return {
    admin,
    totpUri: totp.uri,
    totpSecret: totp.secret,
  };
}

function seedScreens() {
  const now = new Date();
  const demoScreens = [
    {
      name: "Lobby Main",
      slug: "lobby-main",
      zone: "lobby" as const,
      locationDescription: "Front lobby near public entrance",
      rotationIntervalSeconds: 20,
    },
    {
      name: "Courtroom One Door",
      slug: "courtroom-1",
      zone: "courtroom" as const,
      locationDescription: "Outside Courtroom 1",
      rotationIntervalSeconds: 15,
    },
    {
      name: "Info Hallway Two",
      slug: "info-hallway-2",
      zone: "info" as const,
      locationDescription: "Second floor public hallway",
      rotationIntervalSeconds: 30,
    },
  ];

  for (const screen of demoScreens) {
    db.insert(screens)
      .values({
        ...screen,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: screens.slug,
        set: {
          name: screen.name,
          zone: screen.zone,
          locationDescription: screen.locationDescription,
          rotationIntervalSeconds: screen.rotationIntervalSeconds,
          isActive: true,
          lastSeenAt: now,
          updatedAt: now,
        },
      })
      .run();
  }
}

function seedScheduleEntries() {
  const existingTotal =
    db.select({ total: count() }).from(scheduleEntries).get()?.total ?? 0;
  if (existingTotal > 0) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const courtroomScreen =
    db.select()
      .from(screens)
      .where(eq(screens.slug, "courtroom-1"))
      .get() ?? null;

  db.insert(scheduleEntries)
    .values([
      {
        screenId: courtroomScreen?.id ?? null,
        caseNumber: "24-CR-0182",
        caseTitle: "State v. Doe",
        caseType: "Criminal",
        judgeName: "Hon. Sarah Lang",
        courtroom: "Courtroom 1",
        scheduledTime: "08:30",
        estimatedDuration: 45,
        status: "scheduled",
        date: today,
      },
      {
        screenId: courtroomScreen?.id ?? null,
        caseNumber: "24-CV-1130",
        caseTitle: "Acme Builders v. County Works",
        caseType: "Civil",
        judgeName: "Hon. Sarah Lang",
        courtroom: "Courtroom 1",
        scheduledTime: "10:15",
        estimatedDuration: 60,
        status: "scheduled",
        date: today,
      },
      {
        screenId: null,
        caseNumber: "24-TR-7721",
        caseTitle: "People v. Smith",
        caseType: "Traffic",
        judgeName: "Hon. Marcus Hale",
        courtroom: "Traffic Annex",
        scheduledTime: "13:30",
        estimatedDuration: 20,
        status: "scheduled",
        date: today,
      },
    ])
    .run();
}

function seedContentItems() {
  const existingTotal =
    db.select({ total: count() }).from(contentItems).get()?.total ?? 0;
  if (existingTotal > 0) {
    return;
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  db.insert(contentItems)
    .values([
      {
        type: "announcement",
        title: "Welcome to the courthouse",
        body: "Please silence mobile devices and check the screen for courtroom updates before entering secured areas.",
        displayOrder: 1,
        zoneFilter: "lobby",
        startsAt: now,
        expiresAt: tomorrow,
        isEmergency: false,
      },
      {
        type: "announcement",
        title: "Voting information",
        body: "County election services are available on the first floor from 8:00 AM to 4:30 PM.",
        displayOrder: 2,
        zoneFilter: "info",
        startsAt: now,
        expiresAt: tomorrow,
        isEmergency: false,
      },
      {
        type: "html",
        title: "Daily notice",
        body: "<strong>Security screening is required</strong> for all visitors entering courtroom corridors.",
        displayOrder: 3,
        zoneFilter: "all",
        startsAt: now,
        expiresAt: tomorrow,
        isEmergency: false,
      },
    ])
    .run();
}

function recordSeedAudit(adminUserId: string) {
  db.insert(auditLogs)
    .values({
      userId: adminUserId,
      action: "system.seed.completed",
      entityType: "system",
      entityId: "courtboard",
      details: {
        courthouse: getCourthouseName(),
      },
      ipAddress: "127.0.0.1",
    })
    .run();
}

async function main() {
  const { admin, totpSecret, totpUri } = await upsertAdminUser();
  seedScreens();
  seedScheduleEntries();
  seedContentItems();
  recordSeedAudit(admin.id);

  console.log(`Seeded CourtBoard for ${getCourthouseName()}`);
  console.log(`Admin username: ${admin.username}`);
  console.log(`Admin email: ${admin.email}`);
  console.log(`Admin TOTP secret: ${totpSecret}`);
  if (totpUri) {
    console.log(`Admin TOTP URI: ${totpUri}`);
  }
}

void main();
