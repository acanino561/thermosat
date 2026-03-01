import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    if (role !== 'owner' && role !== 'admin') return forbiddenResponse();

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.projectId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('GET /api/projects/[id]/audit error:', error);
    return serverErrorResponse();
  }
}
