import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  simulationRuns,
  simulationResults,
  thermalNodes,
  conductors,
  heatLoads,
  thermalModels,
  simulationConfigs,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
  NodeTemperatureHistory,
  ConductorFlowHistory,
} from '@/lib/db/schema';
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
        and(eq(simulationRuns.id, rid), eq(simulationRuns.modelId, mid)),
      );
    if (!run) return notFoundResponse('Simulation run');

    const results = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.runId, rid));

    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    const nodeNameMap = new Map<string, string>();
    for (const node of nodes) {
      nodeNameMap.set(node.id, node.name);
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'json-results';
    const units = url.searchParams.get('units') ?? 'si';

    switch (format) {
      case 'csv-temp':
        return exportTemperatureCSV(results, nodeNameMap, run, units);
      case 'csv-flow':
        return exportFlowCSV(results, nodeNameMap, run, mid, units);
      case 'csv':
        // Legacy support — same as csv-temp
        return exportTemperatureCSV(results, nodeNameMap, run, units);
      case 'json-full':
        return await exportFullJSON(mid, run, results, nodeNameMap);
      case 'json-results':
      case 'json':
        return exportResultsJSON(run, results, nodeNameMap);
      default:
        return NextResponse.json(
          { error: `Unknown format: ${format}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('GET /api/.../export error:', error);
    return serverErrorResponse();
  }
}

// ── Temperature helpers ─────────────────────────────────────────────────────

function convertTemp(kelvin: number, units: string): number {
  if (units === 'imperial') return (kelvin - 273.15) * 9 / 5 + 32; // °F
  return kelvin; // K (SI default)
}

function tempUnit(units: string): string {
  return units === 'imperial' ? '°F' : 'K';
}

function flowUnit(units: string): string {
  return units === 'imperial' ? 'BTU/h' : 'W';
}

function convertFlow(watts: number, units: string): number {
  if (units === 'imperial') return watts * 3.412142;
  return watts;
}

// ── CSV: Temperature ────────────────────────────────────────────────────────

function exportTemperatureCSV(
  results: Array<{ nodeId: string; timeValues: unknown }>,
  nodeNameMap: Map<string, string>,
  run: { id: string },
  units: string,
): NextResponse {
  if (results.length === 0) {
    return new NextResponse('No data', { status: 404 });
  }

  const firstResult = results[0].timeValues as NodeTemperatureHistory;
  const times = firstResult.times;
  const tu = tempUnit(units);

  const headers = [`Time (s)`];
  const nodeData: number[][] = [];

  for (const result of results) {
    const nodeName = nodeNameMap.get(result.nodeId) ?? result.nodeId;
    headers.push(`${nodeName} (${tu})`);
    const tv = result.timeValues as NodeTemperatureHistory;
    nodeData.push(tv.temperatures);
  }

  const rows: string[] = [headers.join(',')];
  for (let i = 0; i < times.length; i++) {
    const row = [times[i].toString()];
    for (const temps of nodeData) {
      row.push(convertTemp(temps[i] ?? 0, units).toFixed(4));
    }
    rows.push(row.join(','));
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="temperatures_${run.id.slice(0, 8)}.csv"`,
    },
  });
}

// ── CSV: Heat Flow ──────────────────────────────────────────────────────────

function exportFlowCSV(
  results: Array<{ nodeId: string; timeValues: unknown; conductorFlows: unknown }>,
  nodeNameMap: Map<string, string>,
  run: { id: string },
  modelId: string,
  units: string,
): NextResponse {
  // Collect all conductor flows from results
  const allFlows = new Map<string, ConductorFlowHistory>();
  for (const result of results) {
    const flows = result.conductorFlows as ConductorFlowHistory[] | null;
    if (!flows) continue;
    for (const flow of flows) {
      if (!allFlows.has(flow.conductorId)) {
        allFlows.set(flow.conductorId, flow);
      }
    }
  }

  if (allFlows.size === 0) {
    return new NextResponse('No conductor flow data available', { status: 404 });
  }

  const fu = flowUnit(units);
  const flowEntries = Array.from(allFlows.values());
  const times = flowEntries[0].times;

  const headers = ['Time (s)'];
  for (const flow of flowEntries) {
    headers.push(`Conductor_${flow.conductorId.slice(0, 8)} (${fu})`);
  }

  const rows: string[] = [headers.join(',')];
  for (let i = 0; i < times.length; i++) {
    const row = [times[i].toString()];
    for (const flow of flowEntries) {
      row.push(convertFlow(flow.flows[i] ?? 0, units).toFixed(4));
    }
    rows.push(row.join(','));
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="heat_flows_${run.id.slice(0, 8)}.csv"`,
    },
  });
}

// ── JSON: Results Only ──────────────────────────────────────────────────────

function exportResultsJSON(
  run: {
    id: string;
    simulationType: string;
    config: unknown;
    status: string;
    energyBalanceError: number | null;
  },
  results: Array<{ nodeId: string; timeValues: unknown; conductorFlows: unknown }>,
  nodeNameMap: Map<string, string>,
): NextResponse {
  const payload = {
    exportType: 'results-only',
    exportedAt: new Date().toISOString(),
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
      conductorFlows: r.conductorFlows,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="results_${run.id.slice(0, 8)}.json"`,
    },
  });
}

// ── JSON: Full Model + Results ──────────────────────────────────────────────

async function exportFullJSON(
  modelId: string,
  run: {
    id: string;
    simulationType: string;
    config: unknown;
    status: string;
    energyBalanceError: number | null;
    configId: string | null;
  },
  results: Array<{ nodeId: string; timeValues: unknown; conductorFlows: unknown }>,
  nodeNameMap: Map<string, string>,
): Promise<NextResponse> {
  const [modelData] = await db
    .select()
    .from(thermalModels)
    .where(eq(thermalModels.id, modelId));

  const nodesData = await db
    .select()
    .from(thermalNodes)
    .where(eq(thermalNodes.modelId, modelId));

  const conductorsData = await db
    .select()
    .from(conductors)
    .where(eq(conductors.modelId, modelId));

  const heatLoadsData = await db
    .select()
    .from(heatLoads)
    .where(eq(heatLoads.modelId, modelId));

  let simConfig = null;
  if (run.configId) {
    const [cfg] = await db
      .select()
      .from(simulationConfigs)
      .where(eq(simulationConfigs.id, run.configId));
    simConfig = cfg ?? null;
  }

  const payload = {
    exportType: 'full-model-results',
    exportedAt: new Date().toISOString(),
    model: {
      name: modelData.name,
      description: modelData.description,
      orbitalConfig: modelData.orbitalConfig,
      nodes: nodesData,
      conductors: conductorsData,
      heatLoads: heatLoadsData,
    },
    simulationConfig: simConfig
      ? { name: simConfig.name, config: simConfig.config }
      : null,
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
      conductorFlows: r.conductorFlows,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="full_export_${run.id.slice(0, 8)}.json"`,
    },
  });
}
