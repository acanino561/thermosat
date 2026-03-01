import { db } from '@/lib/db/client';
import { auditLogs } from '@/lib/db/schema';
import type { InferInsertModel } from 'drizzle-orm';

type AuditLogInsert = InferInsertModel<typeof auditLogs>;

export async function logAuditEvent(
  event: Omit<AuditLogInsert, 'id' | 'createdAt'>,
): Promise<void> {
  try {
    await db.insert(auditLogs).values(event);
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
