import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, simulationResults, thermalNodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NodeTemperatureHistory } from '@/lib/db/schema';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string; rid: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, rid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const [run] = await db
      .select()
      .from(simulationRuns)
      .where(
        and(
          eq(simulationRuns.id, rid),
          eq(simulationRuns.modelId, mid),
        ),
      );
    if (!run) return notFoundResponse('Simulation run');

    const results = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.runId, rid));

    // Get node names for headers
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    const nodeNameMap = new Map<string, string>();
    for (const node of nodes) {
      nodeNameMap.set(node.id, node.name);
    }

    // Determine format from query params
    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'json';

    if (format === 'csv') {
      return exportCSV(results, nodeNameMap, run);
    }

    // Default: JSON export
    return NextResponse.json({
      run: {
        id: run.id,
        simulationType: run.simulationType,
        config: run.config,
        status: run.status,
        energyBalanceError: run.energyBalanceError,
      },
      results: results.map((r) => ({
        nodeId: r.nodeId,
        nodeName: nodeNameMap.get(r.nodeId) ?? r.nodeId,
        timeValues: r.timeValues,
      })),
    });
  } catch (error) {
    console.error('GET /api/.../export error:', error);
    return serverErrorResponse();
  }
}

function exportCSV(
  results: Array<{
    nodeId: string;
    timeValues: unknown;
  }>,
  nodeNameMap: Map<string, string>,
  run: { id: string },
): NextResponse {
  if (results.length === 0) {
    return new NextResponse('No data', { status: 404 });
  }

  // Build CSV: Time, Node1_Temp, Node2_Temp, ...
  const firstResult = results[0].timeValues as NodeTemperatureHistory;
  const times = firstResult.times;

  // Header row
  const headers = ['Time (s)'];
  const nodeData: number[][] = [];

  for (const result of results) {
    const nodeName = nodeNameMap.get(result.nodeId) ?? result.nodeId;
    headers.push(`${nodeName} (K)`);
    const tv = result.timeValues as NodeTemperatureHistory;
    nodeData.push(tv.temperatures);
  }

  const rows: string[] = [headers.join(',')];

  for (let i = 0; i < times.length; i++) {
    const row = [times[i].toString()];
    for (const temps of nodeData) {
      row.push((temps[i] ?? '').toString());
    }
    rows.push(row.join(','));
  }

  const csv = rows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="simulation-${run.id}.csv"`,
    },
  });
}
