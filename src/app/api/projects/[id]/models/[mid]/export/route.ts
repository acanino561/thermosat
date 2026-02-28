import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  materials,
  simulationConfigs,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

export async function GET(
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

    const [modelData] = await db
      .select()
      .from(thermalModels)
      .where(eq(thermalModels.id, mid));

    const nodesData = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    const conductorsData = await db
      .select()
      .from(conductors)
      .where(eq(conductors.modelId, mid));

    const heatLoadsData = await db
      .select()
      .from(heatLoads)
      .where(eq(heatLoads.modelId, mid));

    const configs = await db
      .select()
      .from(simulationConfigs)
      .where(eq(simulationConfigs.modelId, mid));

    // Collect referenced material IDs and fetch them
    const materialIds = nodesData
      .map((n) => n.materialId)
      .filter((id): id is string => id !== null);
    
    let materialsData: Array<Record<string, unknown>> = [];
    if (materialIds.length > 0) {
      materialsData = await db
        .select()
        .from(materials)
        .where(inArray(materials.id, materialIds));
    }

    const vxm = {
      format: 'verixos-model',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      model: {
        name: modelData.name,
        description: modelData.description,
        orbitalConfig: modelData.orbitalConfig,
        version: modelData.version,
      },
      nodes: nodesData.map((n) => ({
        id: n.id,
        name: n.name,
        nodeType: n.nodeType,
        temperature: n.temperature,
        capacitance: n.capacitance,
        boundaryTemp: n.boundaryTemp,
        materialId: n.materialId,
        area: n.area,
        mass: n.mass,
        absorptivity: n.absorptivity,
        emissivity: n.emissivity,
      })),
      conductors: conductorsData.map((c) => ({
        id: c.id,
        name: c.name,
        conductorType: c.conductorType,
        nodeFromId: c.nodeFromId,
        nodeToId: c.nodeToId,
        conductance: c.conductance,
        area: c.area,
        viewFactor: c.viewFactor,
        emissivity: c.emissivity,
      })),
      heatLoads: heatLoadsData.map((h) => ({
        id: h.id,
        name: h.name,
        nodeId: h.nodeId,
        loadType: h.loadType,
        value: h.value,
        timeValues: h.timeValues,
        orbitalParams: h.orbitalParams,
      })),
      materials: materialsData,
      simulationConfigs: configs.map((c) => ({
        name: c.name,
        config: c.config,
      })),
    };

    return new NextResponse(JSON.stringify(vxm, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${modelData.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.vxm"`,
      },
    });
  } catch (error) {
    console.error('GET /api/.../export vxm error:', error);
    return serverErrorResponse();
  }
}
