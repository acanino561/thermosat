/**
 * Monte Carlo view factor computation — client-side Web Worker launcher.
 *
 * This module extracts triangle data from CadGeometry + SurfaceNodeMappings
 * and dispatches the computation to a Web Worker at /workers/view-factor-worker.js.
 *
 * Implementation: Client-side Web Worker (Option A from spec).
 */

import type { CadFace, CadGeometry, SurfaceNodeMapping } from '@/lib/stores/editor-store';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  normal: [number, number, number];
}

export interface SurfaceData {
  nodeId: string;
  triangles: Triangle[];
}

export type RayQuality = 'fast' | 'default' | 'high';

export const RAY_COUNTS: Record<RayQuality, number> = {
  fast: 10_000,
  default: 100_000,
  high: 1_000_000,
};

export interface ViewFactorResult {
  viewFactor: number;
  nRays: number;
  duration: number; // seconds
  conductorId: string;
}

export interface ViewFactorProgress {
  percent: number;
  raysComplete: number;
}

// ── Geometry extraction ─────────────────────────────────────────────────────

/**
 * Extract triangles from a CadFace.
 * CadFace has: positions (Float32Array, xyz triples), indices (Uint32Array),
 * normals (Float32Array, xyz triples per vertex).
 */
function extractTrianglesFromFace(face: CadFace): Triangle[] {
  const triangles: Triangle[] = [];
  const pos = face.positions;
  const idx = face.indices;
  const norms = face.normals;

  for (let i = 0; i < idx.length; i += 3) {
    const i0 = idx[i];
    const i1 = idx[i + 1];
    const i2 = idx[i + 2];

    const v0: [number, number, number] = [pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]];
    const v1: [number, number, number] = [pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]];
    const v2: [number, number, number] = [pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]];

    // Average vertex normals for face normal
    const nx = (norms[i0 * 3] + norms[i1 * 3] + norms[i2 * 3]) / 3;
    const ny = (norms[i0 * 3 + 1] + norms[i1 * 3 + 1] + norms[i2 * 3 + 1]) / 3;
    const nz = (norms[i0 * 3 + 2] + norms[i1 * 3 + 2] + norms[i2 * 3 + 2]) / 3;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    triangles.push({
      v0,
      v1,
      v2,
      normal: [nx / len, ny / len, nz / len],
    });
  }

  return triangles;
}

/**
 * Build SurfaceData[] from CadGeometry and SurfaceNodeMappings.
 * Groups faces by their mapped nodeId and extracts triangles.
 */
export function buildSurfaceData(
  geometry: CadGeometry,
  mappings: SurfaceNodeMapping[],
): SurfaceData[] {
  const nodeTriangles = new Map<string, Triangle[]>();

  for (const mapping of mappings) {
    const face = geometry.faces.find((f) => f.id === mapping.faceId);
    if (!face) continue;

    const existing = nodeTriangles.get(mapping.nodeId) ?? [];
    existing.push(...extractTrianglesFromFace(face));
    nodeTriangles.set(mapping.nodeId, existing);
  }

  return Array.from(nodeTriangles.entries()).map(([nodeId, triangles]) => ({
    nodeId,
    triangles,
  }));
}

/**
 * Check if both nodes of a conductor have geometry data.
 */
export function hasGeometryForConductor(
  nodeFromId: string,
  nodeToId: string,
  surfaces: SurfaceData[],
): boolean {
  const hasFrom = surfaces.some((s) => s.nodeId === nodeFromId && s.triangles.length > 0);
  const hasTo = surfaces.some((s) => s.nodeId === nodeToId && s.triangles.length > 0);
  return hasFrom && hasTo;
}

// ── Worker launcher ─────────────────────────────────────────────────────────

/**
 * Launch Monte Carlo view factor computation in a Web Worker.
 * Returns a promise that resolves with the result.
 */
export function computeViewFactorAsync(
  surfaceA: SurfaceData,
  surfaceB: SurfaceData,
  allSurfaces: SurfaceData[],
  nRays: number,
  conductorId: string,
  onProgress?: (progress: ViewFactorProgress) => void,
): { promise: Promise<ViewFactorResult>; cancel: () => void } {
  const worker = new Worker('/workers/view-factor-worker.js');
  let cancelled = false;

  const promise = new Promise<ViewFactorResult>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      if (cancelled) return;
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.({ percent: msg.percent, raysComplete: msg.raysComplete });
          break;
        case 'result':
          worker.terminate();
          resolve({
            viewFactor: msg.viewFactor,
            nRays: msg.nRays,
            duration: msg.duration,
            conductorId: msg.conductorId,
          });
          break;
        case 'error':
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message}`));
    };

    // Convert SurfaceData to plain objects (no typed arrays — worker needs transferable-safe data)
    const toPlain = (s: SurfaceData) => ({
      nodeId: s.nodeId,
      triangles: s.triangles.map((t) => ({
        v0: Array.from(t.v0),
        v1: Array.from(t.v1),
        v2: Array.from(t.v2),
        normal: Array.from(t.normal),
      })),
    });

    worker.postMessage({
      type: 'compute',
      surfaceA: toPlain(surfaceA),
      surfaceB: toPlain(surfaceB),
      allSurfaces: allSurfaces.map(toPlain),
      nRays,
      conductorId,
    });
  });

  const cancel = () => {
    cancelled = true;
    worker.terminate();
  };

  return { promise, cancel };
}
