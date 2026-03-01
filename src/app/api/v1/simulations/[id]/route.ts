import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { getUserProjectAccess, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    const [run] = await db.select().from(simulationRuns).where(eq(simulationRuns.id, id));
    if (!run) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, run.modelId));
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    try {
      await getUserProjectAccess(auth.userId, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    return NextResponse.json({ data: run });
  } catch (error) {
    console.error('GET /api/v1/simulations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
