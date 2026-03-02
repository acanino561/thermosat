/**
 * Unit tests for NASTRAN BDF parser and mapper.
 * Run: npx tsx src/__tests__/nastran-bdf-parser.test.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBdf } from '../lib/import/nastran-bdf-parser';
import { mapBdfToVerixos } from '../lib/import/nastran-mapper';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  const ok = actual === expected;
  if (!ok) {
    console.error(`    expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
  }
  assert(ok, message);
}

// ── Test 1: Free-field format parsing ───────────────────────────────────────

console.log('\n=== Test 1: Free-field format (comma-delimited) ===');
{
  const content = readFileSync(
    join(__dirname, 'fixtures/thermal-test.bdf'),
    'utf-8',
  );
  const result = parseBdf(content);

  assertEqual(result.grids.length, 5, 'Should parse 5 GRID points');
  assertEqual(result.grids[0].id, 1, 'First GRID ID = 1');
  assertEqual(result.grids[0].x, 0.0, 'First GRID x = 0.0');
  assertEqual(result.grids[4].id, 5, 'Last GRID ID = 5');
  assertEqual(result.grids[4].x, 0.4, 'Last GRID x = 0.4');

  assertEqual(result.chbdye.length, 3, 'Should parse 3 CHBDYE elements');
  assertEqual(result.chbdye[0].eid, 1, 'First CHBDYE EID = 1');

  assertEqual(result.mat4.length, 2, 'Should parse 2 MAT4 materials');
  assertEqual(result.mat4[0].mid, 1, 'First MAT4 MID = 1');
  assertEqual(result.mat4[0].k, 200.0, 'First MAT4 conductivity = 200');
  assertEqual(result.mat4[0].cp, 500.0, 'First MAT4 specific heat = 500');
  assertEqual(result.mat4[0].rho, 7800.0, 'First MAT4 density = 7800');
  assertEqual(result.mat4[1].mid, 2, 'Second MAT4 MID = 2');

  assertEqual(result.prad.length, 1, 'Should parse 1 PRAD');
  assertEqual(result.prad[0].absorb, 0.3, 'PRAD absorptivity = 0.3');
  assertEqual(result.prad[0].emissivity, 0.85, 'PRAD emissivity = 0.85');

  assertEqual(result.pconv.length, 1, 'Should parse 1 PCONV');
  assertEqual(result.pconv[0].expf, 25.0, 'PCONV expf = 25.0');

  assertEqual(result.spc.length, 2, 'Should parse 2 SPC constraints');
  assertEqual(result.spc[0].nodeId, 1, 'First SPC node = 1');
  assertEqual(result.spc[0].value, 300.0, 'First SPC temp = 300 K');
  assertEqual(result.spc[1].nodeId, 5, 'Second SPC node = 5');
  assertEqual(result.spc[1].value, 400.0, 'Second SPC temp = 400 K');

  assertEqual(result.tempd.length, 1, 'Should parse 1 TEMPD');
  assertEqual(result.tempd[0].temperature, 293.15, 'TEMPD default temp = 293.15');

  assertEqual(result.temp.length, 2, 'Should parse 2 TEMP overrides');
  assertEqual(result.temp[0].nodeId, 2, 'TEMP node 2');
  assertEqual(result.temp[0].temperature, 350.0, 'TEMP 2 = 350 K');

  // Unsupported card warning
  assert(
    result.warnings.some((w) => w.includes('CQUAD4')),
    'Should warn about unsupported CQUAD4 card',
  );
}

// ── Test 2: Small-field format parsing ──────────────────────────────────────

console.log('\n=== Test 2: Small-field format (8-char columns) ===');
{
  const content = readFileSync(
    join(__dirname, 'fixtures/thermal-smallfield.bdf'),
    'utf-8',
  );
  const result = parseBdf(content);

  assertEqual(result.grids.length, 3, 'Should parse 3 GRID points');
  assertEqual(result.grids[0].id, 1, 'First GRID ID = 1');
  assertEqual(result.grids[1].x, 0.05, 'Second GRID x = 0.05');

  assertEqual(result.mat4.length, 1, 'Should parse 1 MAT4');
  assertEqual(result.mat4[0].k, 200.0, 'MAT4 conductivity = 200');

  assertEqual(result.spc.length, 1, 'Should parse 1 SPC');
  assertEqual(result.spc[0].value, 350.0, 'SPC temp = 350 K');

  assertEqual(result.tempd.length, 1, 'Should parse 1 TEMPD');
}

// ── Test 3: Mixed format ────────────────────────────────────────────────────

console.log('\n=== Test 3: Mixed format (free + small field) ===');
{
  const content = `SOL 153
CEND
BEGIN BULK
GRID,1,,0.0,0.0,0.0
GRID           2               0.1     0.0     0.0
MAT4,1,100.0,400.0,8000.0
SPC            1       1       3   273.0
ENDDATA`;
  const result = parseBdf(content);

  assertEqual(result.grids.length, 2, 'Should parse 2 GRID points (mixed format)');
  assertEqual(result.mat4.length, 1, 'Should parse 1 MAT4');
  assertEqual(result.spc.length, 1, 'Should parse 1 SPC');
  assertEqual(result.spc[0].value, 273.0, 'SPC value = 273');
}

// ── Test 4: Mapper ──────────────────────────────────────────────────────────

console.log('\n=== Test 4: BDF → Verixos mapper ===');
{
  const content = readFileSync(
    join(__dirname, 'fixtures/thermal-test.bdf'),
    'utf-8',
  );
  const bdf = parseBdf(content);
  const mapped = mapBdfToVerixos(bdf, 'model-1', 'user-1', 'project-1');

  assertEqual(mapped.nodes.length, 5, 'Should create 5 Verixos nodes');
  assertEqual(mapped.materials.length, 2, 'Should create 2 Verixos materials');

  // Boundary nodes
  const boundaryNodes = mapped.nodes.filter((n) => n.nodeType === 'boundary');
  assertEqual(boundaryNodes.length, 2, 'Should have 2 boundary nodes (SPC)');

  // Boundary temps match SPC values
  const node1 = mapped.nodes.find((n) => n.name === 'Node-1');
  assertEqual(node1?.nodeType, 'boundary', 'Node-1 is boundary');
  assertEqual(node1?.boundaryTemp, 300.0, 'Node-1 boundary temp = 300 K');

  const node5 = mapped.nodes.find((n) => n.name === 'Node-5');
  assertEqual(node5?.nodeType, 'boundary', 'Node-5 is boundary');
  assertEqual(node5?.boundaryTemp, 400.0, 'Node-5 boundary temp = 400 K');

  // TEMP overrides applied
  const node2 = mapped.nodes.find((n) => n.name === 'Node-2');
  assertEqual(node2?.temperature, 350.0, 'Node-2 temp from TEMP card = 350 K');

  // TEMPD default applied to nodes without TEMP override
  const node4 = mapped.nodes.find((n) => n.name === 'Node-4');
  assertEqual(node4?.temperature, 293.15, 'Node-4 uses TEMPD default = 293.15 K');

  // Conductors created
  assert(mapped.conductors.length > 0, 'Should create at least one conductor');

  // Material assigned to diffusion nodes
  const diffNodes = mapped.nodes.filter((n) => n.nodeType === 'diffusion');
  assert(
    diffNodes.every((n) => n.materialId !== null),
    'All diffusion nodes should have a material assigned',
  );

  // Materials have correct properties from PRAD
  const mat1 = mapped.materials[0];
  assertEqual(mat1.conductivity, 200.0, 'Material 1 conductivity = 200');
  assertEqual(mat1.absorptivity, 0.3, 'Material 1 absorptivity from PRAD = 0.3');
  assertEqual(mat1.emissivity, 0.85, 'Material 1 emissivity from PRAD = 0.85');
}

// ── Test 5: Empty/invalid input ─────────────────────────────────────────────

console.log('\n=== Test 5: Edge cases ===');
{
  const empty = parseBdf('');
  assertEqual(empty.grids.length, 0, 'Empty input → 0 grids');
  assertEqual(empty.warnings.length, 0, 'Empty input → 0 warnings');

  const commentsOnly = parseBdf('$ Just a comment\n$ Another comment');
  assertEqual(commentsOnly.grids.length, 0, 'Comments only → 0 grids');

  const noGrids = parseBdf('BEGIN BULK\nMAT4,1,100.0,500.0,8000.0\nENDDATA');
  assertEqual(noGrids.mat4.length, 1, 'No grids but MAT4 still parsed');
  assertEqual(noGrids.grids.length, 0, 'No grids in file');
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed! ✅');
}
