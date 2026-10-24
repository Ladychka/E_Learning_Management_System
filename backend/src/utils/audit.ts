import { prisma } from "../lib/prisma";

export const logAudit = async ({
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValues: (oldValues as any) ?? undefined,
        newValues: (newValues as any) ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};