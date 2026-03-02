/**
 * Maps parsed NASTRAN BDF data to Verixos thermal model entities
 * (nodes, conductors, materials) ready for DB insertion.
 */

import { v4 as uuidv4 } from 'uuid';
import type { BdfParseResult } from './nastran-bdf-parser';

// ── Output types (match DB insert shapes) ───────────────────────────────────

export interface VxNode {
  id: string;
  modelId: string;
  name: string;
  nodeType: 'diffusion' | 'arithmetic' | 'boundary';
  temperature: number;
  capacitance: number | null;
  boundaryTemp: number | null;
  materialId: string | null;
  area: number | null;
  mass: number | null;
  absorptivity: number | null;
  emissivity: number | null;
}

export interface VxConductor {
  id: string;
  modelId: string;
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact' | 'heat_pipe';
  nodeFromId: string;
  nodeToId: string;
  conductance: number | null;
  area: number | null;
  viewFactor: number | null;
  emissivity: number | null;
}

export interface VxMaterial {
  id: string;
  name: string;
  category: 'metal';
  absorptivity: number;
  emissivity: number;
  conductivity: number;
  specificHeat: number;
  density: number;
  tempRangeMin: number;
  tempRangeMax: number;
  isDefault: boolean;
  userId: string;
  projectId: string;
}

export interface MappingResult {
  nodes: VxNode[];
  conductors: VxConductor[];
  materials: VxMaterial[];
  warnings: string[];
}

// Default initial temperature (K) when not specified
const DEFAULT_TEMP_K = 293.15;

/**
 * Map parsed BDF data into Verixos model entities.
 */
export function mapBdfToVerixos(
  bdf: BdfParseResult,
  modelId: string,
  userId: string,
  projectId: string,
): MappingResult {
  const warnings = [...bdf.warnings];

  // ── Build lookup maps ─────────────────────────────────────────────────

  // NASTRAN grid ID → Verixos node UUID
  const gridIdToUuid = new Map<number, string>();

  // Default temperature from TEMPD
  let defaultTemp = DEFAULT_TEMP_K;
  if (bdf.tempd.length > 0) {
    defaultTemp = bdf.tempd[0].temperature;
  }

  // TEMP overrides: NASTRAN grid ID → temperature
  const tempOverrides = new Map<number, number>();
  for (const t of bdf.temp) {
    tempOverrides.set(t.nodeId, t.temperature);
  }

  // SPC constraints: NASTRAN grid ID → fixed temperature
  const spcMap = new Map<number, number>();
  for (const s of bdf.spc) {
    spcMap.set(s.nodeId, s.value);
  }

  // ── Materials (MAT4 → metal material) ─────────────────────────────────

  const materials: VxMaterial[] = [];
  const matIdToUuid = new Map<number, string>();

  for (const m of bdf.mat4) {
    const id = uuidv4();
    matIdToUuid.set(m.mid, id);
    materials.push({
      id,
      name: `MAT4-${m.mid}`,
      category: 'metal',
      absorptivity: 0.5, // default — MAT4 doesn't carry optical props
      emissivity: 0.5,
      conductivity: m.k,
      specificHeat: m.cp || 500,
      density: m.rho || 1000,
      tempRangeMin: 4,
      tempRangeMax: 2000,
      isDefault: false,
      userId,
      projectId,
    });
  }

  for (const m of bdf.mat5) {
    const id = uuidv4();
    matIdToUuid.set(m.mid, id);
    // Use average of diagonal conductivities for isotropic approximation
    const kAvg = (m.kxx + m.kyy + m.kzz) / 3;
    materials.push({
      id,
      name: `MAT5-${m.mid}`,
      category: 'metal',
      absorptivity: 0.5,
      emissivity: 0.5,
      conductivity: kAvg,
      specificHeat: m.cp || 500,
      density: m.rho || 1000,
      tempRangeMin: 4,
      tempRangeMax: 2000,
      isDefault: false,
      userId,
      projectId,
    });
    if (m.kxx !== m.kyy || m.kyy !== m.kzz) {
      warnings.push(
        `MAT5-${m.mid}: anisotropic conductivity averaged to ${kAvg.toFixed(2)} W/(m·K)`,
      );
    }
  }

  // ── Nodes (GRID → diffusion/boundary node) ───────────────────────────

  const nodes: VxNode[] = [];

  for (const g of bdf.grids) {
    const id = uuidv4();
    gridIdToUuid.set(g.id, id);

    const isBoundary = spcMap.has(g.id);
    const temp = tempOverrides.get(g.id) ?? defaultTemp;
    const boundaryTemp = isBoundary ? spcMap.get(g.id)! : null;

    nodes.push({
      id,
      modelId,
      name: `Node-${g.id}`,
      nodeType: isBoundary ? 'boundary' : 'diffusion',
      temperature: isBoundary ? boundaryTemp! : temp,
      capacitance: isBoundary ? null : 1000, // default capacitance
      boundaryTemp,
      materialId: null, // assigned below if CHBDYE references material
      area: null,
      mass: null,
      absorptivity: null,
      emissivity: null,
    });
  }

  // ── Conductors (PCONV → linear, PRAD → radiation) ────────────────────

  const conductors: VxConductor[] = [];

  // For PCONV/PRAD we create conductors between sequential grid nodes
  // since the actual element connectivity comes from CHBDYE/CHBDYG.
  // We'll create conductors from CHBDYE elements connecting parent element
  // to neighboring elements if possible. For a simple mapping, each CHBDYE
  // gets logged; conductors come from PCONV/PRAD connecting consecutive nodes.

  // Build conductors from PCONV properties — convection link
  for (const pc of bdf.pconv) {
    // PCONV defines a convection property; in a full model it's linked via
    // CHBDYE/CHBDYG. For import, we create a conductor template per PCONV.
    // If we have at least 2 nodes, create convection conductors.
    if (nodes.length >= 2) {
      const id = uuidv4();
      conductors.push({
        id,
        modelId,
        name: `Conv-PCONV${pc.pid}`,
        conductorType: 'linear',
        nodeFromId: nodes[0].id,
        nodeToId: nodes[1].id,
        conductance: pc.expf || 10, // Use expf as approx conductance if available
        area: null,
        viewFactor: null,
        emissivity: null,
      });
    }
  }

  // Build conductors from PRAD properties — radiation link
  for (const pr of bdf.prad) {
    if (nodes.length >= 2) {
      const id = uuidv4();
      conductors.push({
        id,
        modelId,
        name: `Rad-PRAD${pr.pid}`,
        conductorType: 'radiation',
        nodeFromId: nodes[0].id,
        nodeToId: nodes[1].id,
        conductance: null,
        area: 0.01, // default area
        viewFactor: 1.0,
        emissivity: pr.emissivity || 0.5,
      });
    }
  }

  // Additionally, create linear conductors between consecutive GRID nodes
  // to establish thermal connectivity (common in NASTRAN thermal models)
  for (let i = 0; i < bdf.grids.length - 1; i++) {
    const fromUuid = gridIdToUuid.get(bdf.grids[i].id);
    const toUuid = gridIdToUuid.get(bdf.grids[i + 1].id);
    if (fromUuid && toUuid) {
      // Check if conductor already exists between these nodes
      const exists = conductors.some(
        (c) =>
          (c.nodeFromId === fromUuid && c.nodeToId === toUuid) ||
          (c.nodeFromId === toUuid && c.nodeToId === fromUuid),
      );
      if (!exists) {
        // Find material conductivity for the link
        const mat = bdf.mat4[0];
        const conductance = mat ? mat.k * 0.01 : 1.0; // k * (A/L) with defaults
        conductors.push({
          id: uuidv4(),
          modelId,
          name: `Link-${bdf.grids[i].id}-${bdf.grids[i + 1].id}`,
          conductorType: 'linear',
          nodeFromId: fromUuid,
          nodeToId: toUuid,
          conductance,
          area: null,
          viewFactor: null,
          emissivity: null,
        });
      }
    }
  }

  // Assign materials to nodes from PRAD absorptivity/emissivity
  for (const pr of bdf.prad) {
    const matUuid = matIdToUuid.get(pr.mid);
    if (matUuid) {
      // Apply optical properties from PRAD to material
      const mat = materials.find((m) => m.id === matUuid);
      if (mat) {
        mat.absorptivity = pr.absorb || mat.absorptivity;
        mat.emissivity = pr.emissivity || mat.emissivity;
      }
    }
  }

  // Link first material to all non-boundary nodes if available
  if (materials.length > 0) {
    const firstMatId = materials[0].id;
    for (const node of nodes) {
      if (node.nodeType !== 'boundary' && !node.materialId) {
        node.materialId = firstMatId;
      }
    }
  }

  return { nodes, conductors, materials, warnings };
}
