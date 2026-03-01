import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, failureAnalyses, failureCases } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string; mid: string; faid: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, faid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'viewer');
    } catch {
      return forbiddenResponse();
    }

    // Verify model belongs to project
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    // Get analysis
    const [analysis] = await db
      .select()
      .from(failureAnalyses)
      .where(
        and(eq(failureAnalyses.id, faid), eq(failureAnalyses.modelId, mid)),
      );
    if (!analysis) return notFoundResponse('Failure analysis');

    // Get cases
    const cases = await db
      .select()
      .from(failureCases)
      .where(eq(failureCases.analysisId, faid));

    return NextResponse.json({
      analysis: {
        id: analysis.id,
        modelId: analysis.modelId,
        baseRunId: analysis.baseRunId,
        status: analysis.status,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
      },
      cases: cases.map((c) => ({
        id: c.id,
        failureType: c.failureType,
        label: c.label,
        params: c.params,
        runId: c.runId,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/.../failure-analysis/[faid] error:', error);
    return serverErrorResponse();
  }
}
