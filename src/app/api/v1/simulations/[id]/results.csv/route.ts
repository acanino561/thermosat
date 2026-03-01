import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, simulationResults, thermalModels, thermalNodes } from '@/lib/db/schema';
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

    const results = await db.select().from(simulationResults).where(eq(simulationResults.runId, id));

    if (results.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    // Get node names for headers
    const nodeIds = results.map((r) => r.nodeId);
    const nodes = await db.select().from(thermalNodes).where(eq(thermalNodes.modelId, run.modelId));
    const nodeMap = new Map(nodes.map((n) => [n.id, n.name]));

    // Build CSV: time column + one column per node
    const timeValues = results[0].timeValues as { times: number[]; temperatures: number[] };
    const times = timeValues.times;

    const headers = ['Time (s)', ...results.map((r) => nodeMap.get(r.nodeId) ?? r.nodeId)];
    const rows = [headers.join(',')];

    for (let i = 0; i < times.length; i++) {
      const row = [times[i].toString()];
      for (const result of results) {
        const tv = result.timeValues as { times: number[]; temperatures: number[] };
        row.push((tv.temperatures[i] ?? '').toString());
      }
      rows.push(row.join(','));
    }

    const csv = rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="simulation-${id}-results.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/simulations/[id]/results.csv error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
