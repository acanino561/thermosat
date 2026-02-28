import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, sensitivityMatrices, thermalNodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
  _request: Request,
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

    // Verify the run belongs to this model
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

    // Get the sensitivity matrix for this run
    const [sensitivity] = await db
      .select()
      .from(sensitivityMatrices)
      .where(eq(sensitivityMatrices.runId, rid));

    if (!sensitivity) {
      return NextResponse.json({
        status: 'not_available',
        computedAt: null,
        entries: [],
      });
    }

    // Enrich entries with parameter labels if complete
    let entries = sensitivity.entries ?? [];

    if (sensitivity.status === 'complete' && entries.length > 0) {
      // Fetch node names for labeling
      const nodes = await db
        .select({ id: thermalNodes.id, name: thermalNodes.name })
        .from(thermalNodes)
        .where(eq(thermalNodes.modelId, mid));

      const nodeNameMap = new Map(nodes.map(n => [n.id, n.name]));

      entries = entries.map(entry => ({
        ...entry,
        parameterLabel: buildParameterLabel(entry.parameterId, entry.parameterType, nodeNameMap),
        nodeName: nodeNameMap.get(entry.nodeId) ?? entry.nodeId,
      }));
    }

    return NextResponse.json({
      status: sensitivity.status,
      computedAt: sensitivity.computedAt?.toISOString() ?? null,
      errorMessage: sensitivity.status === 'failed' ? sensitivity.errorMessage : undefined,
      entries,
    });
  } catch (error) {
    console.error('GET /api/.../sensitivity error:', error);
    return serverErrorResponse();
  }
}

function buildParameterLabel(
  parameterId: string,
  parameterType: string,
  nodeNameMap: Map<string, string>,
): string {
  // parameterId format: type_property_entityId
  const parts = parameterId.split('_');
  const entityId = parts[parts.length - 1];

  if (parameterType === 'node_property') {
    const nodeName = nodeNameMap.get(entityId) ?? entityId;
    if (parameterId.includes('absorptivity')) return `Solar Absorptivity — ${nodeName}`;
    if (parameterId.includes('emissivity')) return `IR Emissivity — ${nodeName}`;
    if (parameterId.includes('capacitance')) return `Capacitance — ${nodeName}`;
    if (parameterId.includes('mass')) return `Mass — ${nodeName}`;
    return `${parameterId} — ${nodeName}`;
  }

  if (parameterType === 'conductor') {
    if (parameterId.includes('conductance')) return `Conductance — ${entityId.slice(0, 8)}`;
    if (parameterId.includes('viewfactor')) return `View Factor — ${entityId.slice(0, 8)}`;
    return parameterId;
  }

  if (parameterType === 'heat_load') {
    return `Heat Load — ${entityId.slice(0, 8)}`;
  }

  return parameterId;
}
