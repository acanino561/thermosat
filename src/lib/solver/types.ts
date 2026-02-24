// ── Physical Constants ──────────────────────────────────────────────────────

export const STEFAN_BOLTZMANN = 5.670374419e-8; // W/(m²·K⁴)
export const SOLAR_CONSTANT = 1361; // W/m²
export const EARTH_RADIUS_KM = 6371; // km
export const EARTH_RADIUS_M = 6371000; // m
export const EARTH_MU = 3.986004418e14; // m³/s² gravitational parameter
export const EARTH_ALBEDO = 0.3;
export const EARTH_IR = 237; // W/m²

// ── Node Types ──────────────────────────────────────────────────────────────

export type NodeType = 'diffusion' | 'arithmetic' | 'boundary';

export interface SolverNode {
  id: string;
  name: string;
  nodeType: NodeType;
  temperature: number; // current temp in K
  initialTemperature: number; // initial temp in K
  capacitance: number; // J/K (0 for arithmetic/boundary)
  boundaryTemp: number | null; // K, only for boundary nodes
  area: number; // m², surface area for environmental loading
  absorptivity: number; // α_s (0-1)
  emissivity: number; // ε_IR (0-1)
}

// ── Conductor Types ─────────────────────────────────────────────────────────

export type ConductorType = 'linear' | 'radiation' | 'contact';

export interface SolverConductor {
  id: string;
  name: string;
  conductorType: ConductorType;
  nodeFromId: string;
  nodeToId: string;
  conductance: number; // W/K for linear/contact
  area: number; // m² for radiation
  viewFactor: number; // F for radiation
  emissivity: number; // effective ε for radiation
}

// ── Heat Load Types ─────────────────────────────────────────────────────────

export type HeatLoadType = 'constant' | 'time_varying' | 'orbital';

export interface TimeValuePair {
  time: number;
  value: number;
}

export interface OrbitalHeatLoadParams {
  surfaceType: 'solar' | 'earth_facing' | 'anti_earth' | 'custom';
  absorptivity: number;
  emissivity: number;
  area: number; // m²
}

export interface SolverHeatLoad {
  id: string;
  name: string;
  nodeId: string;
  loadType: HeatLoadType;
  value: number; // W, for constant
  timeValues: TimeValuePair[]; // piecewise linear
  orbitalParams: OrbitalHeatLoadParams | null;
}

// ── Orbital Environment ─────────────────────────────────────────────────────

export interface OrbitalConfig {
  altitude: number; // km
  inclination: number; // degrees
  raan: number; // degrees
  epoch: string; // ISO date
}

export interface OrbitalEnvironment {
  orbitalPeriod: number; // seconds
  betaAngle: number; // degrees
  eclipseFraction: number; // 0-1
  solarFlux: number; // W/m²
  albedoFlux: number; // W/m² (peak)
  earthIR: number; // W/m²
  earthViewFactor: number; // 0-1
  sunlitFraction: number; // 0-1
}

export interface OrbitalHeatProfile {
  times: number[]; // seconds within one orbit
  solarFlux: number[]; // W/m² at each time
  albedoFlux: number[]; // W/m² at each time
  earthIR: number[]; // W/m² at each time (constant for MVP)
  inSunlight: boolean[]; // true/false at each time
}

// ── Thermal Network ─────────────────────────────────────────────────────────

export interface ThermalNetwork {
  nodes: Map<string, SolverNode>;
  conductors: SolverConductor[];
  heatLoads: SolverHeatLoad[];
  orbitalConfig: OrbitalConfig | null;
  orbitalEnv: OrbitalEnvironment | null;
  orbitalProfile: OrbitalHeatProfile | null;
  nodeIds: string[]; // ordered list of node IDs (diffusion nodes first, then arithmetic)
  diffusionNodeIds: string[];
  arithmeticNodeIds: string[];
  boundaryNodeIds: string[];
}

// ── Simulation Config ───────────────────────────────────────────────────────

export interface SimulationConfig {
  simulationType: 'transient' | 'steady_state';
  timeStart: number; // seconds
  timeEnd: number; // seconds
  timeStep: number; // seconds (initial step for adaptive)
  maxIterations: number;
  tolerance: number;
  minStep: number;
  maxStep: number;
}

// ── Solver Results ──────────────────────────────────────────────────────────

export interface NodeResult {
  nodeId: string;
  times: number[];
  temperatures: number[];
}

export interface ConductorFlowResult {
  conductorId: string;
  times: number[];
  flows: number[]; // W
}

export interface SolverResult {
  nodeResults: NodeResult[];
  conductorFlows: ConductorFlowResult[];
  timePoints: number[];
  energyBalanceError: number;
  converged: boolean;
  iterations?: number;
}
