import { z } from "zod";
import {
  CONTENT_TYPES,
  CONTENT_ZONE_FILTERS,
  SCHEDULE_STATUSES,
  SCREEN_ZONES,
  USER_ROLES,
} from "@/lib/db/schema";

const optionalDateTime = z
  .union([z.string().datetime(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) {
      return null;
    }

    return new Date(value);
  });

export const scheduleEntrySchema = z.object({
  screenId: z.string().trim().optional().nullable(),
  caseNumber: z.string().trim().min(1),
  caseTitle: z.string().trim().min(1),
  caseType: z.string().trim().min(1),
  judgeName: z.string().trim().min(1),
  courtroom: z.string().trim().min(1),
  scheduledTime: z.string().trim().min(1),
  estimatedDuration: z.coerce.number().int().min(0).optional().nullable(),
  status: z.enum(SCHEDULE_STATUSES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const scheduleBulkSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
  action: z.enum(["mark_completed", "delete"]),
});

export const contentItemSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  title: z.string().trim().min(1),
  body: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  zoneFilter: z.enum(CONTENT_ZONE_FILTERS),
  startsAt: optionalDateTime,
  expiresAt: optionalDateTime,
  isEmergency: z.coerce.boolean().default(false),
});

export const screenSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  zone: z.enum(SCREEN_ZONES),
  locationDescription: z.string().trim().optional().nullable(),
  rotationIntervalSeconds: z.coerce.number().int().min(5).max(600),
  isActive: z.coerce.boolean().default(true),
});

export const alertSchema = z.object({
  message: z.string().trim().min(1),
  zone: z.enum(["all", ...SCREEN_ZONES]).default("all"),
});

export const heartbeatSchema = z.object({
  slug: z.string().trim().min(1),
});

export const userCreateSchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().email(),
  name: z.string().trim().min(1),
  password: z.string().min(12),
  role: z.enum(USER_ROLES),
  totpEnabled: z.coerce.boolean().optional().default(false),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(USER_ROLES).optional(),
  password: z.string().min(12).optional(),
  totpEnabled: z.coerce.boolean().optional(),
  resetTotp: z.coerce.boolean().optional(),
});
