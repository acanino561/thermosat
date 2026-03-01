/**
 * Run all V&V benchmarks (1-10)
 * Executes test-solver.ts (benchmarks 1-3), test-solver-v2.ts (benchmarks 4-8),
 * benchmark-09.test.ts (benchmark 9), and benchmark-10.test.ts (benchmark 10).
 */

import { execSync } from 'child_process';
import path from 'path';

console.log('🔬 Running ALL V&V Benchmarks (1-10)\n');
console.log('════════════════════════════════════════════════');

let hasFailure = false;

try {
  console.log('\n▶ Benchmarks 1-3 (test-solver.ts)');
  execSync('npx tsx src/scripts/test-solver.ts', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit',
  });
} catch {
  hasFailure = true;
}

try {
  console.log('\n▶ Benchmarks 4-8 (test-solver-v2.ts)');
  execSync('npx tsx src/scripts/test-solver-v2.ts', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit',
  });
} catch {
  hasFailure = true;
}

try {
  console.log('\n▶ Benchmark 9 (heat pipe conductor)');
  execSync('npx tsx src/__tests__/benchmarks/benchmark-09.test.ts', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit',
  });
} catch {
  hasFailure = true;
}

try {
  console.log('\n▶ Benchmark 10 (Monte Carlo view factors)');
  execSync('npx tsx src/__tests__/benchmarks/benchmark-10.test.ts', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit',
  });
} catch {
  hasFailure = true;
}

console.log('\n════════════════════════════════════════════════');
if (hasFailure) {
  console.error('❌ Some benchmarks FAILED');
  process.exitCode = 1;
} else {
  console.log('✅ All benchmarks PASSED');
}
