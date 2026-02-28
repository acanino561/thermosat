import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { conductors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

/**
 * POST /api/projects/[id]/models/[mid]/view-factors
 *
 * Updates a radiation conductor's view factor after client-side Monte Carlo computation.
 * The actual ray tracing runs in the browser Web Worker; this endpoint persists the result.
 *
 * Body: { conductorId: string, viewFactor: number, nRays: number, duration: number }
 * Response: { success: true, viewFactor: number }
 */
export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { conductorId, viewFactor, nRays, duration } = body as {
      conductorId: string;
      viewFactor: number;
      nRays: number;
      duration: number;
    };

    if (!conductorId || typeof viewFactor !== 'number' || viewFactor < 0 || viewFactor > 1) {
      return NextResponse.json(
        { error: 'Invalid parameters. viewFactor must be between 0 and 1.' },
        { status: 400 },
      );
    }

    // Verify the conductor exists, belongs to this model, and is a radiation conductor
    const [conductor] = await db
      .select()
      .from(conductors)
      .where(and(eq(conductors.id, conductorId), eq(conductors.modelId, mid)));

    if (!conductor) {
      return notFoundResponse('Conductor');
    }

    if (conductor.conductorType !== 'radiation') {
      return NextResponse.json(
        { error: 'View factor computation is only available for radiation conductors' },
        { status: 400 },
      );
    }

    // Update the view factor in the DB
    await db
      .update(conductors)
      .set({ viewFactor })
      .where(eq(conductors.id, conductorId));

    return NextResponse.json({
      success: true,
      viewFactor,
      nRays,
      duration,
    });
  } catch (error) {
    console.error('POST /api/.../view-factors error:', error);
    return serverErrorResponse();
  }
}
