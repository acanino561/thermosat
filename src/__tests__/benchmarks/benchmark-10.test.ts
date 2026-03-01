/**
 * V&V Benchmark 10 — Monte Carlo View Factors
 *
 * Validates Monte Carlo ray tracing against analytical view factors
 * for three classic geometries:
 *
 * 1. Parallel coaxial disks of equal radius (F₁₂ ≈ 0.382)
 * 2. Perpendicular rectangles sharing a common edge (F₁₂ ≈ 0.200)
 * 3. Concentric spheres — inner to outer (F₁₂ = 1.0)
 *
 * The Monte Carlo engine from /public/workers/view-factor-worker.js is
 * replicated here in pure TypeScript for Node.js execution.
 */

// ── Ray tracing engine (extracted from view-factor-worker.js) ───────────────

const EPSILON = 1e-10;

type Vec3 = [number, number, number];

interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  normal: Vec3;
}

interface SurfaceData {
  nodeId: string;
  triangles: Triangle[];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < EPSILON) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function rayTriangleIntersect(origin: Vec3, dir: Vec3, v0: Vec3, v1: Vec3, v2: Vec3): number {
  const edge1 = sub(v1, v0);
  const edge2 = sub(v2, v0);
  const h = cross(dir, edge2);
  const a = dot(edge1, h);
  if (a > -EPSILON && a < EPSILON) return -1;
  const f = 1.0 / a;
  const s = sub(origin, v0);
  const u = f * dot(s, h);
  if (u < 0.0 || u > 1.0) return -1;
  const q = cross(s, edge1);
  const v = f * dot(dir, q);
  if (v < 0.0 || u + v > 1.0) return -1;
  const t = f * dot(edge2, q);
  return t > EPSILON ? t : -1;
}

function triangleArea(v0: Vec3, v1: Vec3, v2: Vec3): number {
  const c = cross(sub(v1, v0), sub(v2, v0));
  return 0.5 * Math.sqrt(dot(c, c));
}

function buildAreaCDF(triangles: Triangle[]): { cdf: number[]; totalArea: number } {
  const areas = triangles.map(t => triangleArea(t.v0, t.v1, t.v2));
  const totalArea = areas.reduce((s, a) => s + a, 0);
  const cdf: number[] = [];
  let cum = 0;
  for (const a of areas) {
    cum += a / totalArea;
    cdf.push(cum);
  }
  if (cdf.length > 0) cdf[cdf.length - 1] = 1.0;
  return { cdf, totalArea };
}

function sampleTriangleIndex(cdf: number[]): number {
  const r = Math.random();
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < r) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function sampleTrianglePoint(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  let u = Math.random();
  let v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return [
    v0[0] + u * (v1[0] - v0[0]) + v * (v2[0] - v0[0]),
    v0[1] + u * (v1[1] - v0[1]) + v * (v2[1] - v0[1]),
    v0[2] + u * (v1[2] - v0[2]) + v * (v2[2] - v0[2]),
  ];
}

function sampleCosineHemisphere(normal: Vec3): Vec3 {
  const n = normalize(normal);
  let t: Vec3;
  if (Math.abs(n[0]) < 0.9) {
    t = normalize(cross([1, 0, 0], n));
  } else {
    t = normalize(cross([0, 1, 0], n));
  }
  const b = cross(n, t);

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

function computeViewFactor(surfaceA: SurfaceData, surfaceB: SurfaceData, allSurfaces: SurfaceData[], nRays: number): number {
  const { cdf: cdfA } = buildAreaCDF(surfaceA.triangles);

  const occluderTriangles: Triangle[] = [];
  const occluderNodeIds: string[] = [];
  for (const surf of allSurfaces) {
    if (surf.nodeId === surfaceA.nodeId) continue;
    for (const tri of surf.triangles) {
      occluderTriangles.push(tri);
      occluderNodeIds.push(surf.nodeId);
    }
  }

  let hitCount = 0;
  for (let i = 0; i < nRays; i++) {
    const triIdx = sampleTriangleIndex(cdfA);
    const tri = surfaceA.triangles[triIdx];
    const origin = sampleTrianglePoint(tri.v0, tri.v1, tri.v2);
    const offsetOrigin: Vec3 = [
      origin[0] + tri.normal[0] * 1e-6,
      origin[1] + tri.normal[1] * 1e-6,
      origin[2] + tri.normal[2] * 1e-6,
    ];
    const dir = sampleCosineHemisphere(tri.normal);

    let closestT = Infinity;
    let closestNodeId: string | null = null;
    for (let j = 0; j < occluderTriangles.length; j++) {
      const oTri = occluderTriangles[j];
      const t = rayTriangleIntersect(offsetOrigin, dir, oTri.v0, oTri.v1, oTri.v2);
      if (t > 0 && t < closestT) {
        closestT = t;
        closestNodeId = occluderNodeIds[j];
      }
    }

    if (closestNodeId === surfaceB.nodeId) {
      hitCount++;
    }
  }

  return hitCount / nRays;
}

// ── Geometry generators ─────────────────────────────────────────────────────

/** Generate a circular disk mesh (triangulated fan) centered at `center`, facing `normal`. */
function generateDisk(center: Vec3, normal: Vec3, radius: number, segments: number): Triangle[] {
  const n = normalize(normal);
  // Build tangent frame
  let t: Vec3;
  if (Math.abs(n[0]) < 0.9) {
    t = normalize(cross([1, 0, 0], n));
  } else {
    t = normalize(cross([0, 1, 0], n));
  }
  const b = cross(n, t);

  const triangles: Triangle[] = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (2 * Math.PI * i) / segments;
    const a2 = (2 * Math.PI * (i + 1)) / segments;

    const p1: Vec3 = [
      center[0] + radius * (Math.cos(a1) * t[0] + Math.sin(a1) * b[0]),
      center[1] + radius * (Math.cos(a1) * t[1] + Math.sin(a1) * b[1]),
      center[2] + radius * (Math.cos(a1) * t[2] + Math.sin(a1) * b[2]),
    ];
    const p2: Vec3 = [
      center[0] + radius * (Math.cos(a2) * t[0] + Math.sin(a2) * b[0]),
      center[1] + radius * (Math.cos(a2) * t[1] + Math.sin(a2) * b[1]),
      center[2] + radius * (Math.cos(a2) * t[2] + Math.sin(a2) * b[2]),
    ];

    triangles.push({ v0: center, v1: p1, v2: p2, normal: n });
  }
  return triangles;
}

/** Generate a rectangle mesh (2 triangles) at given corners. */
function generateRectangle(corners: [Vec3, Vec3, Vec3, Vec3], normal: Vec3): Triangle[] {
  const [a, b, c, d] = corners;
  const n = normalize(normal);
  return [
    { v0: a, v1: b, v2: c, normal: n },
    { v0: a, v1: c, v2: d, normal: n },
  ];
}

/** Generate icosphere with given subdivisions. Returns triangles with outward normals. */
function generateIcosphere(center: Vec3, radius: number, subdivisions: number, invertNormals: boolean = false): Triangle[] {
  // Start with icosahedron
  const t = (1 + Math.sqrt(5)) / 2;
  const rawVerts: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];

  // Normalize to unit sphere
  const verts: Vec3[] = rawVerts.map(v => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len] as Vec3;
  });

  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  // Subdivide
  const midpointCache = new Map<string, number>();
  function getMidpoint(i1: number, i2: number): number {
    const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
    if (midpointCache.has(key)) return midpointCache.get(key)!;
    const v1 = verts[i1], v2 = verts[i2];
    const mid: Vec3 = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
    const len = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
    verts.push([mid[0] / len, mid[1] / len, mid[2] / len]);
    const idx = verts.length - 1;
    midpointCache.set(key, idx);
    return idx;
  }

  for (let s = 0; s < subdivisions; s++) {
    const newFaces: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = getMidpoint(a, b);
      const bc = getMidpoint(b, c);
      const ca = getMidpoint(c, a);
      newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = newFaces;
    midpointCache.clear();
  }

  // Build triangles
  return faces.map(([a, b, c]) => {
    const v0: Vec3 = [center[0] + verts[a][0] * radius, center[1] + verts[a][1] * radius, center[2] + verts[a][2] * radius];
    const v1: Vec3 = [center[0] + verts[b][0] * radius, center[1] + verts[b][1] * radius, center[2] + verts[b][2] * radius];
    const v2: Vec3 = [center[0] + verts[c][0] * radius, center[1] + verts[c][1] * radius, center[2] + verts[c][2] * radius];
    // Normal = average vertex direction (outward from center)
    const cx = (v0[0] + v1[0] + v2[0]) / 3 - center[0];
    const cy = (v0[1] + v1[1] + v2[1]) / 3 - center[1];
    const cz = (v0[2] + v1[2] + v2[2]) / 3 - center[2];
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    const sign = invertNormals ? -1 : 1;
    const normal: Vec3 = [(cx / len) * sign, (cy / len) * sign, (cz / len) * sign];
    return { v0, v1, v2, normal };
  });
}

// ── Analytical view factors ─────────────────────────────────────────────────

/** Parallel coaxial disks of equal radius. R_i = r/H */
function analyticalParallelDisks(r: number, H: number): number {
  const R = r / H;
  const S = 1 + (1 + R * R) / (R * R);
  return 0.5 * (S - Math.sqrt(S * S - 4));
}

/** Perpendicular rectangles with common edge. H, W, L. */
function analyticalPerpRectangles(H: number, W: number, L: number): number {
  // Hottel's crossed-string method / analytical formula for perpendicular rectangles
  // F_12 for two perpendicular rectangles sharing edge of length L
  // Dimensions: surface 1 is W×L, surface 2 is H×L, sharing edge L
  const h = H / L;
  const w = W / L;
  const A = w;
  const B = h;

  // Standard formula (from Incropera, Table 13.1):
  // F_12 = (1/(πW)) * { W*atan(1/W) + H*atan(1/H) - sqrt(H²+W²)*atan(1/sqrt(H²+W²))
  //   + (1/4)*ln[ ((1+W²)(1+H²))/(1+W²+H²) * ((W²(1+W²+H²))/((1+W²)(W²+H²)))^W² * ((H²(1+W²+H²))/((1+H²)(W²+H²)))^H² ] }
  // where H = H/L and W = W/L

  const H2 = B * B;
  const W2 = A * A;
  const term1 = A * Math.atan(1 / A);
  const term2 = B * Math.atan(1 / B);
  const term3 = Math.sqrt(H2 + W2) * Math.atan(1 / Math.sqrt(H2 + W2));
  const lnArg1 = ((1 + W2) * (1 + H2)) / (1 + W2 + H2);
  const lnArg2Base = (W2 * (1 + W2 + H2)) / ((1 + W2) * (W2 + H2));
  const lnArg3Base = (H2 * (1 + W2 + H2)) / ((1 + H2) * (W2 + H2));
  const lnTerm = Math.log(lnArg1) + W2 * Math.log(lnArg2Base) + H2 * Math.log(lnArg3Base);

  return (1 / (Math.PI * A)) * (term1 + term2 - term3 + 0.25 * lnTerm);
}

// ── Test execution ──────────────────────────────────────────────────────────

let exitCode = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function relativeError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual);
  return Math.abs((actual - expected) / expected);
}

console.log('🔬 Benchmark 10 — Monte Carlo View Factors\n');

const N_RAYS = 100_000; // CI-friendly; use 1M for high-precision validation

// ── Geometry 1: Parallel coaxial disks ──────────────────────────────────────
function testParallelDisks() {
  console.log('\n── Geometry 1: Parallel Coaxial Disks (R=0.5m, H=0.5m) ──');

  const r = 0.5, H = 0.5;
  const F_analytical = analyticalParallelDisks(r, H);
  console.log(`  Analytical F₁₂ = ${F_analytical.toFixed(6)}`);

  // Disk 1 at z=0 facing +z, Disk 2 at z=H facing -z
  const segments = 64;
  const disk1: SurfaceData = { nodeId: 'disk1', triangles: generateDisk([0, 0, 0], [0, 0, 1], r, segments) };
  const disk2: SurfaceData = { nodeId: 'disk2', triangles: generateDisk([0, 0, H], [0, 0, -1], r, segments) };
  const allSurfaces = [disk1, disk2];

  const F_mc = computeViewFactor(disk1, disk2, allSurfaces, N_RAYS);
  const err = relativeError(F_mc, F_analytical);
  console.log(`  Monte Carlo F₁₂ = ${F_mc.toFixed(6)} (${N_RAYS} rays)`);
  console.log(`  Relative error: ${(err * 100).toFixed(2)}%`);

  assert(err < 0.05, `B10-G1: Parallel disks error ${(err * 100).toFixed(2)}% < 5% at ${N_RAYS} rays`);
}

// ── Geometry 2: Perpendicular rectangles ────────────────────────────────────
function testPerpRectangles() {
  console.log('\n── Geometry 2: Perpendicular Rectangles (W=1m, H=1m, L=1m) ──');

  const W = 1, H = 1, L = 1;
  const F_analytical = analyticalPerpRectangles(H, W, L);
  console.log(`  Analytical F₁₂ = ${F_analytical.toFixed(6)}`);

  // Surface 1: on XZ plane (y=0), width W along x, length L along z
  // Surface 2: on YZ plane (x=0), height H along y, length L along z
  // Common edge: z-axis from (0,0,0) to (0,0,L)

  const rect1: SurfaceData = {
    nodeId: 'rect1',
    triangles: generateRectangle(
      [[0, 0, 0], [W, 0, 0], [W, 0, L], [0, 0, L]],
      [0, 1, 0], // facing +y
    ),
  };

  const rect2: SurfaceData = {
    nodeId: 'rect2',
    triangles: generateRectangle(
      [[0, 0, 0], [0, H, 0], [0, H, L], [0, 0, L]],
      [1, 0, 0], // facing +x
    ),
  };

  const allSurfaces = [rect1, rect2];
  const F_mc = computeViewFactor(rect1, rect2, allSurfaces, N_RAYS);
  const err = relativeError(F_mc, F_analytical);
  console.log(`  Monte Carlo F₁₂ = ${F_mc.toFixed(6)} (${N_RAYS} rays)`);
  console.log(`  Relative error: ${(err * 100).toFixed(2)}%`);

  assert(err < 0.05, `B10-G2: Perp rectangles error ${(err * 100).toFixed(2)}% < 5% at ${N_RAYS} rays`);
}

// ── Geometry 3: Concentric spheres ──────────────────────────────────────────
function testConcentricSpheres() {
  console.log('\n── Geometry 3: Concentric Spheres (r₁=0.5m, r₂=1.0m) ──');

  const r1 = 0.5, r2 = 1.0;
  const F_analytical = 1.0; // Inner sphere sees only outer sphere
  console.log(`  Analytical F₁₂ = ${F_analytical.toFixed(6)}`);

  // Inner sphere: outward normals, Outer sphere: inward normals
  const subdivisions = 3; // ~1280 triangles per sphere
  const innerSphere: SurfaceData = {
    nodeId: 'inner',
    triangles: generateIcosphere([0, 0, 0], r1, subdivisions, false),
  };
  const outerSphere: SurfaceData = {
    nodeId: 'outer',
    triangles: generateIcosphere([0, 0, 0], r2, subdivisions, true),
  };

  const allSurfaces = [innerSphere, outerSphere];
  const F_mc = computeViewFactor(innerSphere, outerSphere, allSurfaces, N_RAYS);
  const err = relativeError(F_mc, F_analytical);
  console.log(`  Monte Carlo F₁₂ = ${F_mc.toFixed(6)} (${N_RAYS} rays)`);
  console.log(`  Relative error: ${(err * 100).toFixed(2)}%`);

  assert(err < 0.05, `B10-G3: Concentric spheres error ${(err * 100).toFixed(2)}% < 5% at ${N_RAYS} rays`);
}

testParallelDisks();
testPerpRectangles();
testConcentricSpheres();

console.log('\n══════════════════════════════════════════════════');
console.log('Benchmark 10 complete.');
process.exitCode = exitCode;
