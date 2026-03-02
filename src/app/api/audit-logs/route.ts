export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLogs, orgMembers } from '@/lib/db/schema';
import { eq, and, lt, desc, SQL } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, AccessDeniedError } from '@/lib/auth/access';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const projectId = url.searchParams.get('projectId');
    const modelId = url.searchParams.get('modelId');
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');
    const before = url.searchParams.get('before');
    const limitParam = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 500);

    // Auth: must be org admin or project admin+
    if (orgId) {
      const [membership] = await db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, user.id)));
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        return forbiddenResponse();
      }
    } else if (projectId) {
      try {
        const role = await getUserProjectAccess(user.id, projectId);
        if (role !== 'owner' && role !== 'admin') return forbiddenResponse();
      } catch (e) {
        if (e instanceof AccessDeniedError) return forbiddenResponse();
        throw e;
      }
    } else {
      return NextResponse.json({ error: 'orgId or projectId is required' }, { status: 400 });
    }

    const conditions: SQL[] = [];
    if (orgId) conditions.push(eq(auditLogs.orgId, orgId));
    if (projectId) conditions.push(eq(auditLogs.projectId, projectId));
    if (modelId) conditions.push(eq(auditLogs.modelId, modelId));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action as typeof auditLogs.action.enumValues[number]));
    if (before) conditions.push(lt(auditLogs.createdAt, new Date(before)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitParam);

    const nextCursor = logs.length === limitParam ? logs[logs.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({ data: logs, nextCursor });
  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return serverErrorResponse();
  }
}
