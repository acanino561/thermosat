/**
 * Monte Carlo View Factor Web Worker
 * Computes F_ij (view factor from surface i to surface j) using ray tracing.
 * 
 * Approach: Client-side Web Worker (Option A) — avoids webpack bundling issues.
 * 
 * Input message: { type: 'compute', surfaceA: SurfaceData, surfaceB: SurfaceData,
 *                  allSurfaces: SurfaceData[], nRays: number, conductorId: string }
 * 
 * SurfaceData: { nodeId: string, triangles: Array<{ v0, v1, v2, normal }> }
 *   where v0/v1/v2 are [x, y, z] and normal is [nx, ny, nz]
 * 
 * Output messages:
 *   { type: 'progress', percent: number, raysComplete: number }
 *   { type: 'result', viewFactor: number, nRays: number, duration: number, conductorId: string }
 *   { type: 'error', message: string }
 * 
 * Performance note: Pure JS ray tracing. At 1M rays on a 50-triangle model,
 * expect ~30-120s depending on hardware. TODO: Port to WASM (Rust) if this
 * becomes a bottleneck for complex models.
 */

// ── Möller–Trumbore ray-triangle intersection ──────────────────────────────
const EPSILON = 1e-10;

/**
 * Returns distance t >= 0 if ray hits triangle, or -1 if miss.
 * Ray: origin + t * direction
 */
function rayTriangleIntersect(origin, dir, v0, v1, v2) {
  const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

  const h = cross(dir, edge2);
  const a = dot(edge1, h);
  if (a > -EPSILON && a < EPSILON) return -1; // parallel

  const f = 1.0 / a;
  const s = [origin[0] - v0[0], origin[1] - v0[1], origin[2] - v0[2]];
  const u = f * dot(s, h);
  if (u < 0.0 || u > 1.0) return -1;

  const q = cross(s, edge1);
  const v = f * dot(dir, q);
  if (v < 0.0 || u + v > 1.0) return -1;

  const t = f * dot(edge2, q);
  return t > EPSILON ? t : -1;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < EPSILON) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ── Sampling helpers ────────────────────────────────────────────────────────

/** Pick a random point on a triangle, uniform by area. */
function sampleTrianglePoint(v0, v1, v2) {
  let u = Math.random();
  let v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return [
    v0[0] + u * (v1[0] - v0[0]) + v * (v2[0] - v0[0]),
    v0[1] + u * (v1[1] - v0[1]) + v * (v2[1] - v0[1]),
    v0[2] + u * (v1[2] - v0[2]) + v * (v2[2] - v0[2]),
  ];
}

/** Compute area of a triangle. */
function triangleArea(v0, v1, v2) {
  const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  const c = cross(e1, e2);
  return 0.5 * Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
}

/**
 * Build a CDF for area-weighted triangle sampling.
 * Returns { cdf: number[], totalArea: number }
 */
function buildAreaCDF(triangles) {
  const areas = triangles.map(t => triangleArea(t.v0, t.v1, t.v2));
  const totalArea = areas.reduce((s, a) => s + a, 0);
  const cdf = [];
  let cumulative = 0;
  for (const a of areas) {
    cumulative += a / totalArea;
    cdf.push(cumulative);
  }
  if (cdf.length > 0) cdf[cdf.length - 1] = 1.0; // fix float precision
  return { cdf, totalArea };
}

/** Pick a triangle index using the CDF (area-weighted). */
function sampleTriangleIndex(cdf) {
  const r = Math.random();
  // Binary search
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < r) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Sample a cosine-weighted random direction in the hemisphere above `normal`.
 * Uses Malley's method: uniform sample on disk, project up.
 */
function sampleCosineHemisphere(normal) {
  // Build tangent frame
  const n = normalize(normal);
  let t;
  if (Math.abs(n[0]) < 0.9) {
    t = normalize(cross([1, 0, 0], n));
  } else {
    t = normalize(cross([0, 1, 0], n));
  }
  const b = cross(n, t);

  // Cosine-weighted hemisphere: uniform on disk + project
  const r1 = Math.random();
  const r2 = Math.random();
  const cosTheta = Math.sqrt(1 - r1);
  const sinTheta = Math.sqrt(r1);
  const phi = 2 * Math.PI * r2;

  const x = sinTheta * Math.cos(phi);
  const y = sinTheta * Math.sin(phi);
  const z = cosTheta;

  return normalize([
    x * t[0] + y * b[0] + z * n[0],
    x * t[1] + y * b[1] + z * n[1],
    x * t[2] + y * b[2] + z * n[2],
  ]);
}

// ── Main computation ────────────────────────────────────────────────────────

/**
 * Compute view factor F_AB using Monte Carlo ray tracing.
 * @param {Object} surfaceA - Source surface { triangles: [...] }
 * @param {Object} surfaceB - Target surface { nodeId: string, triangles: [...] }
 * @param {Array} allSurfaces - All surfaces (for occlusion testing)
 * @param {number} nRays - Number of rays to cast
 * @param {Function} onProgress - Progress callback
 * @returns {{ viewFactor: number }}
 */
function computeViewFactor(surfaceA, surfaceB, allSurfaces, nRays, onProgress) {
  const { cdf: cdfA } = buildAreaCDF(surfaceA.triangles);

  // Pre-collect all triangles from all surfaces EXCEPT surfaceA for intersection testing
  // (rays shouldn't self-intersect with source surface)
  const occluderTriangles = [];
  const occluderNodeIds = [];
  for (const surf of allSurfaces) {
    if (surf.nodeId === surfaceA.nodeId) continue;
    for (const tri of surf.triangles) {
      occluderTriangles.push(tri);
      occluderNodeIds.push(surf.nodeId);
    }
  }

  let hitCount = 0;
  const progressInterval = Math.max(1, Math.floor(nRays / 100));

  for (let i = 0; i < nRays; i++) {
    // 1. Sample origin on surface A
    const triIdx = sampleTriangleIndex(cdfA);
    const tri = surfaceA.triangles[triIdx];
    const origin = sampleTrianglePoint(tri.v0, tri.v1, tri.v2);

    // Small offset along normal to avoid self-intersection
    const offsetOrigin = [
      origin[0] + tri.normal[0] * 1e-6,
      origin[1] + tri.normal[1] * 1e-6,
      origin[2] + tri.normal[2] * 1e-6,
    ];

    // 2. Sample cosine-weighted direction from hemisphere
    const dir = sampleCosineHemisphere(tri.normal);

    // 3. Find closest intersection among all occluder triangles
    let closestT = Infinity;
    let closestNodeId = null;

    for (let j = 0; j < occluderTriangles.length; j++) {
      const oTri = occluderTriangles[j];
      const t = rayTriangleIntersect(offsetOrigin, dir, oTri.v0, oTri.v1, oTri.v2);
      if (t > 0 && t < closestT) {
        closestT = t;
        closestNodeId = occluderNodeIds[j];
      }
    }

    // 4. If closest hit is surface B → count
    if (closestNodeId === surfaceB.nodeId) {
      hitCount++;
    }

    // Progress reporting
    if ((i + 1) % progressInterval === 0) {
      onProgress(Math.round(((i + 1) / nRays) * 100), i + 1);
    }
  }

  return { viewFactor: hitCount / nRays };
}

// ── Worker message handler ──────────────────────────────────────────────────

self.onmessage = function (e) {
  const msg = e.data;
  if (msg.type !== 'compute') return;

  const { surfaceA, surfaceB, allSurfaces, nRays, conductorId } = msg;

  if (!surfaceA || !surfaceB || !surfaceA.triangles.length || !surfaceB.triangles.length) {
    self.postMessage({ type: 'error', message: 'Missing surface geometry data' });
    return;
  }

  const startTime = performance.now();

  try {
    const result = computeViewFactor(
      surfaceA,
      surfaceB,
      allSurfaces,
      nRays,
      (percent, raysComplete) => {
        self.postMessage({ type: 'progress', percent, raysComplete });
      },
    );

    const duration = (performance.now() - startTime) / 1000; // seconds

    self.postMessage({
      type: 'result',
      viewFactor: result.viewFactor,
      nRays,
      duration,
      conductorId,
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || 'Computation failed' });
  }
};
