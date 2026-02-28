import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, thermalNodes, conductors, heatLoads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
} from '@/lib/utils/api-helpers';
import type { OrbitalConfig } from '@/lib/solver/types';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

export interface ValidationError {
  type: 'error' | 'warning';
  category: 'node' | 'conductor' | 'heat_load' | 'orbital' | 'general';
  message: string;
  elementId?: string;
  elementName?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    nodeCount: number;
    diffusionNodeCount: number;
    conductorCount: number;
    heatLoadCount: number;
    hasOrbitalConfig: boolean;
  };
}

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

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const nodes = await db.select().from(thermalNodes).where(eq(thermalNodes.modelId, mid));
    const modelConductors = await db.select().from(conductors).where(eq(conductors.modelId, mid));
    const loads = await db.select().from(heatLoads).where(eq(heatLoads.modelId, mid));

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const diffusionNodes = nodes.filter((n) => n.nodeType === 'diffusion');

    // Must have at least 1 node
    if (nodes.length === 0) {
      errors.push({
        type: 'error',
        category: 'general',
        message: 'Model has no nodes. Add at least one node before simulating.',
      });
    }

    // Check diffusion nodes have capacitance > 0
    for (const node of diffusionNodes) {
      if (!node.capacitance || node.capacitance <= 0) {
        errors.push({
          type: 'error',
          category: 'node',
          message: `Diffusion node "${node.name}" must have capacitance > 0 (current: ${node.capacitance ?? 0} J/K)`,
          elementId: node.id,
          elementName: node.name,
        });
      }
    }

    // Check boundary nodes have boundaryTemp set
    for (const node of nodes.filter((n) => n.nodeType === 'boundary')) {
      if (node.boundaryTemp === null || node.boundaryTemp === undefined) {
        errors.push({
          type: 'error',
          category: 'node',
          message: `Boundary node "${node.name}" must have a boundary temperature set`,
          elementId: node.id,
          elementName: node.name,
        });
      }
    }

    // Validate conductors reference valid nodes
    for (const cond of modelConductors) {
      if (!nodeIdSet.has(cond.nodeFromId)) {
        errors.push({
          type: 'error',
          category: 'conductor',
          message: `Conductor "${cond.name}" references non-existent source node`,
          elementId: cond.id,
          elementName: cond.name,
        });
      }
      if (!nodeIdSet.has(cond.nodeToId)) {
        errors.push({
          type: 'error',
          category: 'conductor',
          message: `Conductor "${cond.name}" references non-existent target node`,
          elementId: cond.id,
          elementName: cond.name,
        });
      }
      if (cond.nodeFromId === cond.nodeToId) {
        errors.push({
          type: 'error',
          category: 'conductor',
          message: `Conductor "${cond.name}" connects a node to itself`,
          elementId: cond.id,
          elementName: cond.name,
        });
      }

      // Check conductor has valid conductance or radiation params
      if (cond.conductorType === 'linear' || cond.conductorType === 'contact') {
        if (!cond.conductance || cond.conductance <= 0) {
          warnings.push({
            type: 'warning',
            category: 'conductor',
            message: `Conductor "${cond.name}" has zero or negative conductance (${cond.conductance ?? 0} W/K)`,
            elementId: cond.id,
            elementName: cond.name,
          });
        }
      } else if (cond.conductorType === 'radiation') {
        if (!cond.area || cond.area <= 0) {
          warnings.push({
            type: 'warning',
            category: 'conductor',
            message: `Radiation conductor "${cond.name}" has zero or negative area`,
            elementId: cond.id,
            elementName: cond.name,
          });
        }
        if (!cond.viewFactor || cond.viewFactor <= 0 || cond.viewFactor > 1) {
          warnings.push({
            type: 'warning',
            category: 'conductor',
            message: `Radiation conductor "${cond.name}" has invalid view factor (${cond.viewFactor ?? 0}, should be 0-1)`,
            elementId: cond.id,
            elementName: cond.name,
          });
        }
      } else if (cond.conductorType === 'heat_pipe') {
        const data = (cond as Record<string, unknown>).conductanceData as { points: Array<{ temperature: number; conductance: number }> } | null;
        if (!data || !data.points || data.points.length < 2) {
          warnings.push({
            type: 'warning',
            category: 'conductor',
            message: `Heat pipe conductor "${cond.name}" requires at least 2 conductance data points`,
            elementId: cond.id,
            elementName: cond.name,
          });
        }
      }
    }

    // Validate heat loads reference valid nodes
    for (const load of loads) {
      if (!nodeIdSet.has(load.nodeId)) {
        errors.push({
          type: 'error',
          category: 'heat_load',
          message: `Heat load "${load.name}" references non-existent node`,
          elementId: load.id,
          elementName: load.name,
        });
      }
    }

    // Check orbital loads require orbital config
    const hasOrbitalLoads = loads.some((l) => l.loadType === 'orbital');
    const orbitalConfig = model.orbitalConfig as OrbitalConfig | null;
    if (hasOrbitalLoads && !orbitalConfig) {
      errors.push({
        type: 'error',
        category: 'orbital',
        message:
          'Model has orbital heat loads but no orbital configuration. Set altitude, inclination, RAAN, and epoch.',
      });
    }

    if (orbitalConfig) {
      if (!orbitalConfig.altitude || orbitalConfig.altitude <= 0) {
        errors.push({
          type: 'error',
          category: 'orbital',
          message: `Orbital altitude must be positive (current: ${orbitalConfig.altitude ?? 0} km)`,
        });
      }
    }

    // Warn if no heat loads and all initial temps are zero
    if (loads.length === 0 && nodes.every((n) => n.temperature === 0)) {
      warnings.push({
        type: 'warning',
        category: 'general',
        message:
          'No heat loads and all initial temperatures are 0K. The simulation may produce trivial results.',
      });
    }

    // Warn if isolated nodes (no conductors connected)
    for (const node of nodes) {
      const connected = modelConductors.some(
        (c) => c.nodeFromId === node.id || c.nodeToId === node.id,
      );
      if (!connected && nodes.length > 1) {
        warnings.push({
          type: 'warning',
          category: 'node',
          message: `Node "${node.name}" is not connected to any conductor`,
          elementId: node.id,
          elementName: node.name,
        });
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        nodeCount: nodes.length,
        diffusionNodeCount: diffusionNodes.length,
        conductorCount: modelConductors.length,
        heatLoadCount: loads.length,
        hasOrbitalConfig: !!orbitalConfig,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/.../validate error:', error);
    return serverErrorResponse();
  }
}
