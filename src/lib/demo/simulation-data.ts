/**
 * Pre-computed simulation results for 6U CubeSat in 400km LEO.
 *
 * Orbital parameters:
 *   Altitude:  400 km (ISS-like)
 *   Inclination: 51.6°
 *   Period:    92.4 min
 *   Eclipse:   ~35% of orbit (32.3 min eclipse / 60.1 min sunlight)
 *   Simulated: 3 full orbits = 277.2 min
 *   Δt:        30 s → 555 data points
 *
 * Physical model:
 *   Solar flux: 1361 W/m²
 *   Albedo:     0.30 (Earth reflection)
 *   Earth IR:   237 W/m² (average)
 *   σ = 5.67e-8 W/m²K⁴ (Stefan-Boltzmann)
 */

// ─── Orbital geometry helpers ────────────────────────────────────────

const ORBIT_PERIOD = 92.4; // minutes
const ECLIPSE_FRACTION = 0.35;
const ECLIPSE_DURATION = ORBIT_PERIOD * ECLIPSE_FRACTION; // ~32.3 min
const SUNLIGHT_DURATION = ORBIT_PERIOD * (1 - ECLIPSE_FRACTION); // ~60.1 min
const TOTAL_TIME = ORBIT_PERIOD * 3; // 277.2 min
const DT = 0.5; // minutes (30 seconds)
const N_POINTS = Math.ceil(TOTAL_TIME / DT) + 1;

/** Returns true if the satellite is in eclipse at time t (minutes). */
export function isInEclipse(t: number): boolean {
  const phase = ((t % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD;
  // Eclipse occupies the last portion of each orbit
  return phase > SUNLIGHT_DURATION;
}

/** Returns a smooth solar illumination factor [0..1] with penumbra transitions. */
function solarFactor(t: number): number {
  const phase = ((t % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD;
  const penumbra = 1.0; // minutes of penumbra transition
  // Entering eclipse
  const enterEclipse = SUNLIGHT_DURATION;
  if (phase > enterEclipse - penumbra && phase <= enterEclipse) {
    return (enterEclipse - phase) / penumbra;
  }
  // Exiting eclipse (beginning of orbit = exiting eclipse from previous orbit)
  if (phase < penumbra) {
    return phase / penumbra;
  }
  return phase <= SUNLIGHT_DURATION ? 1.0 : 0.0;
}

/** Sun angle factor — varies sinusoidally within sunlit portion. */
function sunAngle(t: number): number {
  const phase = ((t % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD;
  if (phase > SUNLIGHT_DURATION) return 0;
  // Peak at middle of sunlit portion
  return Math.sin((phase / SUNLIGHT_DURATION) * Math.PI);
}

// ─── Thermal profile generators ──────────────────────────────────────

function generateTimeSeries(): number[] {
  const times: number[] = [];
  for (let i = 0; i < N_POINTS; i++) {
    times.push(Math.round(i * DT * 100) / 100);
  }
  return times;
}

/**
 * Generic transient thermal solver for a single node.
 * dT/dt = (Q_in - Q_rad) / C
 * Q_rad = ε * σ * A * T⁴
 */
function solveNode(params: {
  initialTemp: number;
  capacitance: number;        // J/K
  area: number;               // m²
  absorptivity: number;
  emissivity: number;
  internalPower: number;      // W (constant dissipation)
  solarExposure: number;      // fraction of solar flux absorbed (0-1, geometry factor)
  albedoExposure: number;     // fraction of albedo heating
  earthIRExposure: number;    // fraction of Earth IR heating
  phaseOffset: number;        // minutes offset in orbit
}): number[] {
  const sigma = 5.67e-8;
  const solarFlux = 1361;
  const albedoFraction = 0.3;
  const earthIR = 237;
  const dtSec = DT * 60;

  const temps: number[] = [];
  let T = params.initialTemp;

  for (let i = 0; i < N_POINTS; i++) {
    const t = i * DT + params.phaseOffset;
    const sf = solarFactor(t);
    const sa = sunAngle(t);

    // Solar input
    const Qsolar = params.absorptivity * solarFlux * params.area * params.solarExposure * sf * (0.4 + 0.6 * sa);
    
    // Albedo (only in sunlight, peaks when looking at Earth)
    const Qalbedo = params.absorptivity * solarFlux * albedoFraction * params.area * params.albedoExposure * sf * 0.5;
    
    // Earth IR (always present, slight variation)
    const QearthIR = params.emissivity * earthIR * params.area * params.earthIRExposure;
    
    // Internal dissipation
    const Qinternal = params.internalPower;
    
    // Total heat in
    const Qin = Qsolar + Qalbedo + QearthIR + Qinternal;
    
    // Radiative heat out
    const Qrad = params.emissivity * sigma * params.area * Math.pow(T, 4);
    
    // Temperature update (Euler forward)
    const dT = (Qin - Qrad) / params.capacitance * dtSec;
    T = T + dT;
    
    // Clamp to physical range
    T = Math.max(3, Math.min(500, T));
    
    temps.push(Math.round(T * 100) / 100);
  }

  return temps;
}

// ─── Generate all node temperature profiles ──────────────────────────

export const simulationTimes = generateTimeSeries();

export interface NodeProfile {
  nodeIndex: number;
  name: string;
  temperatures: number[];
  color: string;
}

/** Node mapping: index in the demo seed order → profile parameters */
const nodeConfigs = [
  {
    name: '+X Panel',
    initialTemp: 290,
    capacitance: 150,
    area: 0.06,
    absorptivity: 0.92,
    emissivity: 0.85,
    internalPower: 0,
    solarExposure: 0.85,
    albedoExposure: 0.3,
    earthIRExposure: 0.4,
    phaseOffset: 0,
    color: '#ff6b6b',
  },
  {
    name: '-X Panel',
    initialTemp: 260,
    capacitance: 150,
    area: 0.06,
    absorptivity: 0.92,
    emissivity: 0.85,
    internalPower: 0,
    solarExposure: 0.25,
    albedoExposure: 0.5,
    earthIRExposure: 0.5,
    phaseOffset: 0,
    color: '#4ecdc4',
  },
  {
    name: '+Y Panel (Solar Array)',
    initialTemp: 280,
    capacitance: 80,
    area: 0.12, // solar panels — larger collection area
    absorptivity: 0.92,
    emissivity: 0.80,
    internalPower: 0,
    solarExposure: 0.95,
    albedoExposure: 0.15,
    earthIRExposure: 0.25,
    phaseOffset: 2,
    color: '#ffe66d',
  },
  {
    name: '-Y Panel',
    initialTemp: 275,
    capacitance: 80,
    area: 0.03,
    absorptivity: 0.25,
    emissivity: 0.80,
    internalPower: 0,
    solarExposure: 0.3,
    albedoExposure: 0.4,
    earthIRExposure: 0.45,
    phaseOffset: 4,
    color: '#a29bfe',
  },
  {
    name: 'Battery Pack',
    initialTemp: 293,
    capacitance: 500,
    area: 0.01,
    absorptivity: 0.5,
    emissivity: 0.5,
    internalPower: 2,
    solarExposure: 0,
    albedoExposure: 0.1,
    earthIRExposure: 0.15,
    phaseOffset: 0,
    color: '#fd79a8',
  },
  {
    name: 'Flight Computer',
    initialTemp: 305,
    capacitance: 200,
    area: 0.005,
    absorptivity: 0.5,
    emissivity: 0.5,
    internalPower: 5,
    solarExposure: 0,
    albedoExposure: 0.05,
    earthIRExposure: 0.1,
    phaseOffset: 0,
    color: '#00cec9',
  },
  {
    name: 'Deep Space',
    initialTemp: 3,
    capacitance: 1e12, // effectively infinite — boundary node
    area: 0,
    absorptivity: 0,
    emissivity: 0,
    internalPower: 0,
    solarExposure: 0,
    albedoExposure: 0,
    earthIRExposure: 0,
    phaseOffset: 0,
    color: '#636e72',
  },
];

// Generate profiles
export const nodeProfiles: NodeProfile[] = nodeConfigs.map((cfg, idx) => ({
  nodeIndex: idx,
  name: cfg.name,
  temperatures: cfg.name === 'Deep Space'
    ? Array(N_POINTS).fill(3)
    : solveNode(cfg),
  color: cfg.color,
}));

// ─── Conductor heat flows ────────────────────────────────────────────

export interface ConductorFlowProfile {
  conductorIndex: number;
  name: string;
  flows: number[];
  color: string;
}

/** Compute conductor heat flows based on temperature differences. */
function computeConductorFlows(): ConductorFlowProfile[] {
  const conductorDefs = [
    { name: '+X Panel → Battery', fromIdx: 0, toIdx: 4, conductance: 0.5, type: 'linear', color: '#74b9ff' },
    { name: '-X Panel → Battery', fromIdx: 1, toIdx: 4, conductance: 0.5, type: 'linear', color: '#55efc4' },
    { name: '+Y Panel → FC', fromIdx: 2, toIdx: 5, conductance: 0.3, type: 'linear', color: '#ffeaa7' },
    { name: '+X Panel → Deep Space', fromIdx: 0, toIdx: 6, area: 0.06, viewFactor: 0.8, emissivity: 0.85, type: 'radiation', color: '#ff7675' },
    { name: '-X Panel → Deep Space', fromIdx: 1, toIdx: 6, area: 0.06, viewFactor: 0.8, emissivity: 0.85, type: 'radiation', color: '#a29bfe' },
    { name: 'Battery → FC', fromIdx: 4, toIdx: 5, conductance: 1.0, type: 'linear', color: '#fab1a0' },
  ];

  const sigma = 5.67e-8;

  return conductorDefs.map((cDef, cIdx) => {
    const fromTemps = nodeProfiles[cDef.fromIdx].temperatures;
    const toTemps = nodeProfiles[cDef.toIdx].temperatures;
    const flows: number[] = [];

    for (let i = 0; i < N_POINTS; i++) {
      const Tf = fromTemps[i];
      const Tt = toTemps[i];
      let Q: number;
      if (cDef.type === 'linear') {
        Q = (cDef.conductance ?? 0) * (Tf - Tt);
      } else {
        // Radiation: Q = ε * σ * A * VF * (T_from⁴ - T_to⁴)
        Q = (cDef.emissivity ?? 0.85) * sigma * (cDef.area ?? 0.06) * (cDef.viewFactor ?? 0.8)
          * (Math.pow(Tf, 4) - Math.pow(Tt, 4));
      }
      flows.push(Math.round(Q * 1000) / 1000);
    }

    return {
      conductorIndex: cIdx,
      name: cDef.name,
      flows,
      color: cDef.color,
    };
  });
}

export const conductorFlows = computeConductorFlows();

// ─── Eclipse periods (for chart shading) ─────────────────────────────

export interface EclipsePeriod {
  start: number; // minutes
  end: number;   // minutes
}

export function getEclipsePeriods(): EclipsePeriod[] {
  const periods: EclipsePeriod[] = [];
  let inEclipse = false;
  let start = 0;

  for (let i = 0; i < N_POINTS; i++) {
    const t = i * DT;
    const eclipse = isInEclipse(t);
    if (eclipse && !inEclipse) {
      start = t;
      inEclipse = true;
    } else if (!eclipse && inEclipse) {
      periods.push({ start, end: t });
      inEclipse = false;
    }
  }
  if (inEclipse) {
    periods.push({ start, end: TOTAL_TIME });
  }
  return periods;
}

export const eclipsePeriods = getEclipsePeriods();

// ─── Summary statistics ──────────────────────────────────────────────

export interface NodeSummary {
  name: string;
  min: number;
  max: number;
  avg: number;
  swing: number;
  exceedsLimits: boolean;
  limitViolation: string | null;
}

/** Typical operational limits for CubeSat components (K). */
export const operationalLimits: Record<string, { min: number; max: number }> = {
  '+X Panel': { min: 173, max: 398 },
  '-X Panel': { min: 173, max: 398 },
  '+Y Panel (Solar Array)': { min: 173, max: 398 },
  '-Y Panel': { min: 173, max: 398 },
  'Battery Pack': { min: 273, max: 323 },
  'Flight Computer': { min: 253, max: 343 },
  'Deep Space': { min: 0, max: 1e6 },
};

export function computeSummaries(): NodeSummary[] {
  return nodeProfiles.map((p) => {
    const temps = p.temperatures;
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const swing = max - min;
    const limits = operationalLimits[p.name] ?? { min: 0, max: 1e6 };
    const exceedsLimits = min < limits.min || max > limits.max;
    let limitViolation: string | null = null;
    if (min < limits.min) limitViolation = `Below min (${limits.min}K)`;
    if (max > limits.max) limitViolation = `Above max (${limits.max}K)`;
    return {
      name: p.name,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      swing: Math.round(swing * 10) / 10,
      exceedsLimits,
      limitViolation,
    };
  });
}

export const nodeSummaries = computeSummaries();

// ─── Energy balance ──────────────────────────────────────────────────

export interface EnergyBalance {
  totalEnergyIn: number;     // J over full simulation
  totalEnergyRadiated: number;
  totalEnergyStored: number;
  balanceError: number;      // percentage
}

export function computeEnergyBalance(): EnergyBalance {
  const sigma = 5.67e-8;
  const solarFlux = 1361;
  const albedoFraction = 0.3;
  const earthIR = 237;
  const dtSec = DT * 60;

  let totalIn = 0;
  let totalRad = 0;
  let totalStored = 0;

  for (let i = 0; i < N_POINTS; i++) {
    const t = i * DT;
    const sf = solarFactor(t);
    const sa = sunAngle(t);

    // Sum over all non-boundary nodes
    for (let nIdx = 0; nIdx < nodeConfigs.length - 1; nIdx++) {
      const cfg = nodeConfigs[nIdx];
      const T = nodeProfiles[nIdx].temperatures[i];

      const Qsolar = cfg.absorptivity * solarFlux * cfg.area * cfg.solarExposure * sf * (0.4 + 0.6 * sa);
      const Qalbedo = cfg.absorptivity * solarFlux * albedoFraction * cfg.area * cfg.albedoExposure * sf * 0.5;
      const QearthIR = cfg.emissivity * earthIR * cfg.area * cfg.earthIRExposure;
      const Qinternal = cfg.internalPower;
      const Qrad = cfg.emissivity * sigma * cfg.area * Math.pow(T, 4);

      totalIn += (Qsolar + Qalbedo + QearthIR + Qinternal) * dtSec;
      totalRad += Qrad * dtSec;
    }
  }

  // Energy stored = sum of C * ΔT for each node
  for (let nIdx = 0; nIdx < nodeConfigs.length - 1; nIdx++) {
    const cfg = nodeConfigs[nIdx];
    const temps = nodeProfiles[nIdx].temperatures;
    const dT = temps[temps.length - 1] - temps[0];
    totalStored += cfg.capacitance * dT;
  }

  const balanceError = Math.abs(totalIn - totalRad - totalStored) / Math.max(totalIn, 1) * 100;

  return {
    totalEnergyIn: Math.round(totalIn),
    totalEnergyRadiated: Math.round(totalRad),
    totalEnergyStored: Math.round(totalStored),
    balanceError: Math.round(balanceError * 100) / 100,
  };
}

export const energyBalance = computeEnergyBalance();

// ─── Convergence diagnostics ─────────────────────────────────────────

export interface ConvergenceDiagnostics {
  /** Iteration count per timestep */
  iterationsPerStep: { time: number; iterations: number }[];
  /** Adaptive timestep history */
  timeStepHistory: { time: number; dt: number }[];
  /** Cumulative energy balance over time */
  cumulativeEnergyBalance: { time: number; energyIn: number; energyOut: number; stored: number; error: number }[];
}

function computeConvergenceDiagnostics(): ConvergenceDiagnostics {
  const iterationsPerStep: { time: number; iterations: number }[] = [];
  const timeStepHistory: { time: number; dt: number }[] = [];
  const cumulativeEnergyBalance: { time: number; energyIn: number; energyOut: number; stored: number; error: number }[] = [];

  let cumIn = 0;
  let cumOut = 0;

  for (let i = 0; i < N_POINTS; i++) {
    const t = i * DT;
    // Simulate iteration counts — more iterations during eclipse transitions
    const phase = ((t % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD;
    const nearTransition = Math.abs(phase - SUNLIGHT_DURATION) < 3 || phase < 3;
    const iters = nearTransition ? Math.floor(4 + Math.random() * 4) : Math.floor(2 + Math.random() * 2);
    iterationsPerStep.push({ time: t, iterations: iters });

    // Adaptive timestep — smaller near transitions
    const dtAdaptive = nearTransition ? DT * 0.5 : DT;
    timeStepHistory.push({ time: t, dt: dtAdaptive });

    // Cumulative energy
    const dtSec = DT * 60;
    const sf = isInEclipse(t) ? 0 : 1;
    cumIn += sf * 1361 * 0.06 * 0.92 * dtSec;
    // Approximate radiation from average node temp
    const avgTemp = nodeProfiles.slice(0, 6).reduce((s, p) => s + p.temperatures[Math.min(i, p.temperatures.length - 1)], 0) / 6;
    cumOut += 5.67e-8 * 0.85 * 0.36 * Math.pow(avgTemp, 4) * dtSec;
    const stored = cumIn - cumOut;
    const error = cumIn > 0 ? Math.abs(stored) / cumIn * 100 : 0;
    cumulativeEnergyBalance.push({ time: t, energyIn: cumIn, energyOut: cumOut, stored, error });
  }

  return { iterationsPerStep, timeStepHistory, cumulativeEnergyBalance };
}

export const convergenceDiagnostics = computeConvergenceDiagnostics();

// ─── Exports for store integration ───────────────────────────────────

export const ORBIT_PERIOD_MIN = ORBIT_PERIOD;
export const TOTAL_TIME_MIN = TOTAL_TIME;
export const TIME_STEP_MIN = DT;
export const NUM_POINTS = N_POINTS;

/**
 * Get temperature of a node at a specific time index.
 */
export function getTemperatureAtTime(nodeIndex: number, timeIndex: number): number {
  if (nodeIndex < 0 || nodeIndex >= nodeProfiles.length) return 0;
  const temps = nodeProfiles[nodeIndex].temperatures;
  if (timeIndex < 0 || timeIndex >= temps.length) return temps[temps.length - 1] ?? 0;
  return temps[timeIndex];
}

/**
 * Get all node temperatures at a specific time index.
 */
export function getAllTemperaturesAtTime(timeIndex: number): number[] {
  return nodeProfiles.map((p) => {
    if (timeIndex < 0 || timeIndex >= p.temperatures.length) return p.temperatures[p.temperatures.length - 1] ?? 0;
    return p.temperatures[timeIndex];
  });
}

/**
 * Convert a time in minutes to a time index.
 */
export function timeToIndex(timeMin: number): number {
  return Math.round(timeMin / DT);
}
