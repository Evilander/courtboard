import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { serializeAudit } from "@/lib/serializers";

export function listAuditLogs(filters?: {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  const where = [];

  if (filters?.action) {
    where.push(eq(auditLogs.action, filters.action));
  }

  if (filters?.userId) {
    where.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters?.from) {
    where.push(gte(auditLogs.createdAt, filters.from));
  }

  if (filters?.to) {
    where.push(lte(auditLogs.createdAt, filters.to));
  }

  const query = where.length ? and(...where) : undefined;

  const rows = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      username: users.username,
      userRole: users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(query)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const total =
    db.select({ total: count() }).from(auditLogs).where(query).get()?.total ?? 0;

  return {
    items: rows.map(serializeAudit),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
