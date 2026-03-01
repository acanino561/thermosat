import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  failureAnalyses,
  failureCases,
  simulationResults,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import type { NodeTemperatureHistory } from '@/lib/db/schema';

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

    // Get all nodes for this model
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    // Collect all run IDs from completed cases
    const runIds = cases
      .filter((c) => c.runId !== null)
      .map((c) => c.runId as string);

    // Fetch all simulation results for these runs
    let allResults: Array<{
      id: string;
      runId: string;
      nodeId: string;
      timeValues: NodeTemperatureHistory;
    }> = [];

    if (runIds.length > 0) {
      allResults = await db
        .select({
          id: simulationResults.id,
          runId: simulationResults.runId,
          nodeId: simulationResults.nodeId,
          timeValues: simulationResults.timeValues,
        })
        .from(simulationResults)
        .where(inArray(simulationResults.runId, runIds));
    }

    // Index results by runId -> nodeId
    const resultsByRunAndNode = new Map<string, Map<string, NodeTemperatureHistory>>();
    for (const r of allResults) {
      if (!resultsByRunAndNode.has(r.runId)) {
        resultsByRunAndNode.set(r.runId, new Map());
      }
      resultsByRunAndNode.get(r.runId)!.set(r.nodeId, r.timeValues);
    }

    // Build risk matrix
    const riskMatrix = nodes.map((node) => {
      const nodeCases = cases.map((c) => {
        const runMap = c.runId ? resultsByRunAndNode.get(c.runId) : null;
        const timeValues = runMap?.get(node.id);

        let minTemp = 0;
        let maxTemp = 0;
        let meanTemp = 0;

        if (timeValues && timeValues.temperatures.length > 0) {
          const temps = timeValues.temperatures;
          minTemp = Math.min(...temps);
          maxTemp = Math.max(...temps);
          meanTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
        }

        // Determine status based on limits (none defined in schema, so pass by default)
        // tempLimitMin / tempLimitMax are not in the schema yet, so always 'pass'
        let status: 'pass' | 'warn' | 'fail' = 'pass';

        return {
          caseId: c.id,
          failureType: c.failureType,
          minTemp: Math.round(minTemp * 100) / 100,
          maxTemp: Math.round(maxTemp * 100) / 100,
          meanTemp: Math.round(meanTemp * 100) / 100,
          status,
        };
      });

      return {
        nodeId: node.id,
        nodeName: node.name,
        tempLimitMin: null as number | null,
        tempLimitMax: null as number | null,
        cases: nodeCases,
      };
    });

    return NextResponse.json({
      analysisId: analysis.id,
      cases: cases.map((c) => ({
        id: c.id,
        failureType: c.failureType,
        label: c.label,
        runId: c.runId,
      })),
      riskMatrix,
    });
  } catch (error) {
    console.error('GET /api/.../failure-analysis/[faid]/results error:', error);
    return serverErrorResponse();
  }
}
