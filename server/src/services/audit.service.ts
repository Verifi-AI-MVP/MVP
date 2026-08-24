import { prisma } from '../lib/prisma.js';

export async function logAudit(data: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details != null ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress,
    },
  }).catch(() => {});
}
