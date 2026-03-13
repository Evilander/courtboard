import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditDetails = Record<string, unknown> | null;

export function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: AuditDetails;
  ipAddress?: string | null;
}) {
  db.insert(auditLogs)
    .values({
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
    })
    .run();
}
