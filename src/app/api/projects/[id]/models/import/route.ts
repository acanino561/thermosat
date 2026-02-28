import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationConfigs,
} from '@/lib/db/schema';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface VxmNode {
  id: string;
  name: string;
  nodeType: 'diffusion' | 'arithmetic' | 'boundary';
  temperature: number;
  capacitance?: number | null;
  boundaryTemp?: number | null;
  materialId?: string | null;
  area?: number | null;
  mass?: number | null;
  absorptivity?: number | null;
  emissivity?: number | null;
}

interface VxmConductor {
  id: string;
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact' | 'heat_pipe';
  nodeFromId: string;
  nodeToId: string;
  conductance?: number | null;
  area?: number | null;
  viewFactor?: number | null;
  emissivity?: number | null;
  conductanceData?: { points: Array<{ temperature: number; conductance: number }> } | null;
}

interface VxmHeatLoad {
  id: string;
  name: string;
  nodeId: string;
  loadType: 'constant' | 'time_varying' | 'orbital';
  value?: number | null;
  timeValues?: { time: number; value: number }[] | null;
  orbitalParams?: {
    surfaceType: 'solar' | 'earth_facing' | 'anti_earth' | 'custom';
    absorptivity: number;
    emissivity: number;
    area: number;
  } | null;
}

interface VxmFile {
  format: string;
  version: string;
  model: {
    name: string;
    description?: string | null;
    orbitalConfig?: unknown;
  };
  nodes: VxmNode[];
  conductors: VxmConductor[];
  heatLoads: VxmHeatLoad[];
  simulationConfigs?: Array<{ name: string; config: unknown }>;
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const body = await request.json() as VxmFile;

    if (body.format !== 'verixos-model') {
      return NextResponse.json(
        { error: 'Invalid file format. Expected verixos-model (.vxm).' },
        { status: 400 },
      );
    }

    if (!body.model?.name || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: 'Invalid .vxm file structure.' },
        { status: 400 },
      );
    }

    // Create the model
    const [newModel] = await db
      .insert(thermalModels)
      .values({
        projectId: id,
        name: `${body.model.name} (imported)`,
        description: body.model.description ?? '',
        orbitalConfig: body.model.orbitalConfig as any,
      })
      .returning();

    // Build old-id → new-id map for nodes
    const nodeIdMap = new Map<string, string>();

    // Insert nodes
    if (body.nodes.length > 0) {
      const insertedNodes = await db
        .insert(thermalNodes)
        .values(
          body.nodes.map((n) => ({
            modelId: newModel.id,
            name: n.name,
            nodeType: n.nodeType,
            temperature: n.temperature,
            capacitance: n.capacitance ?? null,
            boundaryTemp: n.boundaryTemp ?? null,
            materialId: null, // Don't carry over materialId references
            area: n.area ?? null,
            mass: n.mass ?? null,
            absorptivity: n.absorptivity ?? null,
            emissivity: n.emissivity ?? null,
          })),
        )
        .returning();

      for (let i = 0; i < body.nodes.length; i++) {
        nodeIdMap.set(body.nodes[i].id, insertedNodes[i].id);
      }
    }

    // Insert conductors with remapped node IDs
    if (body.conductors.length > 0) {
      await db.insert(conductors).values(
        body.conductors
          .filter(
            (c) =>
              nodeIdMap.has(c.nodeFromId) && nodeIdMap.has(c.nodeToId),
          )
          .map((c) => ({
            modelId: newModel.id,
            name: c.name,
            conductorType: c.conductorType,
            nodeFromId: nodeIdMap.get(c.nodeFromId)!,
            nodeToId: nodeIdMap.get(c.nodeToId)!,
            conductance: c.conductance ?? null,
            area: c.area ?? null,
            viewFactor: c.viewFactor ?? null,
            emissivity: c.emissivity ?? null,
            conductanceData: c.conductanceData ?? null,
          })),
      );
    }

    // Insert heat loads with remapped node IDs
    if (body.heatLoads.length > 0) {
      await db.insert(heatLoads).values(
        body.heatLoads
          .filter((h) => nodeIdMap.has(h.nodeId))
          .map((h) => ({
            modelId: newModel.id,
            nodeId: nodeIdMap.get(h.nodeId)!,
            name: h.name,
            loadType: h.loadType,
            value: h.value ?? null,
            timeValues: h.timeValues ?? null,
            orbitalParams: h.orbitalParams ?? null,
          })),
      );
    }

    // Insert simulation configs
    if (body.simulationConfigs && body.simulationConfigs.length > 0) {
      await db.insert(simulationConfigs).values(
        body.simulationConfigs.map((c) => ({
          modelId: newModel.id,
          name: c.name,
          config: c.config as any,
        })),
      );
    }

    return NextResponse.json(
      {
        message: 'Model imported successfully',
        modelId: newModel.id,
        name: newModel.name,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/.../import error:', error);
    return serverErrorResponse();
  }
}
