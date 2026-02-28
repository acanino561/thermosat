/**
 * Heat Pipe Conductor — temperature-dependent effective conductance.
 *
 * G_eff is interpolated from a piecewise linear curve provided by the user.
 * Q = G_eff(T_avg) × (T₁ - T₂), where T_avg = (T₁ + T₂) / 2.
 */

export interface ConductancePoint {
  temperature: number; // K
  conductance: number; // W/K
}

/**
 * Piecewise linear interpolation of G_eff from conductanceData points.
 *
 * Edge cases:
 *  - T below lowest point → clamp to first conductance
 *  - T above highest point → clamp to last conductance
 *  - Empty/null points → return 0
 */
export function interpolateGeff(
  points: ConductancePoint[] | null | undefined,
  tAvg: number,
): number {
  if (!points || points.length === 0) {
    console.warn('Heat pipe conductor has no conductance data points; returning G_eff = 0');
    return 0;
  }

  if (points.length === 1) {
    return points[0].conductance;
  }

  // Clamp below
  if (tAvg <= points[0].temperature) {
    return points[0].conductance;
  }

  // Clamp above
  if (tAvg >= points[points.length - 1].temperature) {
    return points[points.length - 1].conductance;
  }

  // Binary search for bracketing interval
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].temperature <= tAvg) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const t0 = points[lo].temperature;
  const t1 = points[hi].temperature;
  const g0 = points[lo].conductance;
  const g1 = points[hi].conductance;
  const frac = (tAvg - t0) / (t1 - t0);
  return g0 + frac * (g1 - g0);
}

/**
 * Compute heat flow through a heat pipe conductor.
 * Q = G_eff(T_avg) × (T_from - T_to)
 */
export function computeHeatPipeFlow(
  points: ConductancePoint[] | null | undefined,
  tFrom: number,
  tTo: number,
): number {
  const tAvg = (tFrom + tTo) / 2;
  const gEff = interpolateGeff(points, tAvg);
  return gEff * (tFrom - tTo);
}
