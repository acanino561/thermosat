/**
 * Verify solar flux distribution across CubeSat panels with attitude modeling.
 * Run: npx tsx src/scripts/verify-solar-flux.ts
 */

import { calculateOrbitalEnvironment, generateOrbitalHeatProfile, computeSpacecraftPositionECI, computeSunDirectionLVLH, computeSunDirectionAtTime } from '../lib/solver/orbital-environment';
import { SOLAR_CONSTANT, type OrbitalConfig } from '../lib/solver/types';

const config: OrbitalConfig = {
  altitude: 550,
  inclination: 51.6,
  raan: 180,
  epoch: '2025-06-21T12:00:00Z',
  attitude: 'nadir_pointing',
};

const env = calculateOrbitalEnvironment(config);
const profile = generateOrbitalHeatProfile(config, env, 360);

console.log(`Beta angle: ${env.betaAngle.toFixed(1)}°`);
console.log(`Eclipse fraction: ${(env.eclipseFraction * 100).toFixed(1)}%`);
console.log(`Orbital period: ${(env.orbitalPeriod / 60).toFixed(1)} min`);
console.log('');

// Surface normals (body frame)
const panels = [
  { name: '+X (velocity)',       normal: { x:  1, y:  0, z:  0 } },
  { name: '-X (anti-velocity)',  normal: { x: -1, y:  0, z:  0 } },
  { name: '+Y (orbit normal)',   normal: { x:  0, y:  1, z:  0 } },
  { name: '-Y (anti-orbit-normal)', normal: { x:  0, y: -1, z:  0 } },
  { name: '+Z (zenith)',         normal: { x:  0, y:  0, z:  1 } },
  { name: '-Z (nadir)',          normal: { x:  0, y:  0, z: -1 } },
];

for (const panel of panels) {
  let totalCos = 0;
  let sunlitSteps = 0;

  for (let i = 0; i < profile.times.length; i++) {
    if (!profile.inSunlight[i]) continue;
    sunlitSteps++;
    
    const sun = profile.sunDirectionLVLH![i];
    // body → LVLH: flip z
    const nx = panel.normal.x;
    const ny = panel.normal.y;
    const nz = -panel.normal.z;
    const cos = Math.max(0, sun.x * nx + sun.y * ny + sun.z * nz);
    totalCos += cos;
  }

  const avgCos = totalCos / profile.times.length;
  const avgFluxPct = (avgCos * 100).toFixed(1);
  const avgFluxW = (avgCos * SOLAR_CONSTANT).toFixed(0);

  console.log(`${panel.name.padEnd(28)} avg cos: ${avgCos.toFixed(3)}  →  ${avgFluxPct}% of S  (${avgFluxW} W/m²)`);
}
