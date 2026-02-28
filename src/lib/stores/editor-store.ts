import { create } from 'zustand';
import type { ColorScale, ThermalRange } from '@/lib/thermal-colors';
import type { SensitivityEntry } from '@/lib/what-if/sensitivity-calc';

// Types matching the backend schema
export interface ThermalNode {
  id: string;
  name: string;
  nodeType: 'diffusion' | 'arithmetic' | 'boundary';
  temperature: number;
  capacitance?: number | null;
  boundaryTemp?: number | null;
  materialId?: string | null;
  area?: number | null;
  mass?: number | null;
  absorptivity?: number | null;
  emissivity?: number | null;
  // UI positioning
  x?: number;
  y?: number;
}

export interface ConductanceDataPoint {
  temperature: number;
  conductance: number;
}

export interface ConductanceData {
  points: ConductanceDataPoint[];
}

export interface Conductor {
  id: string;
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact' | 'heat_pipe';
  nodeFromId: string;
  nodeToId: string;
  conductance?: number | null;
  area?: number | null;
  viewFactor?: number | null;
  emissivity?: number | null;
  conductanceData?: ConductanceData | null;
}

export interface HeatLoad {
  id: string;
  name: string;
  nodeId: string;
  loadType: 'constant' | 'time_varying' | 'orbital';
  value?: number | null;
  timeValues?: { time: number; value: number }[] | null;
  orbitalParams?: {
    surfaceType: 'solar' | 'earth_facing' | 'anti_earth' | 'custom';
    absorptivity: number;
    emissivity: number;
    area: number;
  } | null;
}

export interface OrbitalConfig {
  orbitType?: 'leo' | 'meo' | 'geo' | 'heo';
  altitude: number;
  inclination: number;
  raan: number;
  epoch: string;
  apogeeAltitude?: number;
  perigeeAltitude?: number;
}

export interface NodeTemperatureHistory {
  times: number[];
  temperatures: number[];
}

export interface SimulationResults {
  runId: string;
  status: 'completed' | 'failed';
  nodeResults: Record<string, NodeTemperatureHistory>;
  conductorFlows?: Record<string, { times: number[]; flows: number[] }>;
  energyBalanceError?: number;
}

export interface SimulationConfig {
  simulationType: 'transient' | 'steady_state';
  config: {
    timeStart: number;
    timeEnd: number;
    timeStep: number;
    maxIterations: number;
    tolerance: number;
  };
}

export interface HistoryEntry {
  snapshot: EditorSnapshot;
  description: string;
  timestamp: number;
}

interface EditorSnapshot {
  nodes: ThermalNode[];
  conductors: Conductor[];
  heatLoads: HeatLoad[];
}

const MAX_HISTORY = 150;
const DEBOUNCE_MS = 500;
const AUTO_SAVE_DEBOUNCE_MS = 30_000; // 30 seconds
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ─── CAD Geometry Types ───────────────────────────────────────────────

export interface CadFace {
  id: string;
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  color: [number, number, number];
  surfaceArea: number;
}

export interface CadGeometry {
  fileName: string;
  faces: CadFace[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  totalSurfaceArea: number;
}

// ─── Surface-to-Node Mapping ──────────────────────────────────────────

export interface SurfaceNodeMapping {
  faceId: string;
  nodeId: string;
}

// Preset palette for node-to-color assignment
export const NODE_COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e',
  '#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#10b981',
] as const;

// ─── Viewport Polish Types ────────────────────────────────────────────

export type RenderMode = 'solid' | 'wireframe' | 'thermal' | 'material';
export type CameraPreset = 'isometric' | '+x' | '-x' | '+y' | '-y' | '+z' | '-z' | 'fit-all';

export interface ViewportState {
  renderMode: RenderMode;
  colorScale: ColorScale;
  thermalRange: ThermalRange;
  focusTargetId: string | null;
}

export type CadImportStatus = 'idle' | 'parsing' | 'done' | 'error';

export interface CadImportProgress {
  percent: number;
  message: string;
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorState {
  // Model metadata
  projectId: string | null;
  modelId: string | null;
  modelName: string;

  // Model data
  nodes: ThermalNode[];
  conductors: Conductor[];
  heatLoads: HeatLoad[];
  orbitalConfig: OrbitalConfig | null;

  // UI state
  selectedNodeId: string | null;
  selectedConductorId: string | null;
  selectedHeatLoadId: string | null;
  showResultsOverlay: boolean;
  isDirty: boolean;
  activeView: '3d' | 'network' | 'results';

  // Auto-save state
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: string | null;
  _autoSaveTimer: ReturnType<typeof setTimeout> | null;
  _snapshotIntervalTimer: ReturnType<typeof setInterval> | null;
  _lastSnapshotAt: number;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  /** Timer id for debounced property edits */
  _debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Pending description for debounced push */
  _pendingDescription: string | null;

  // CAD import
  cadGeometry: CadGeometry | null;
  cadImportStatus: CadImportStatus;
  cadImportProgress: CadImportProgress;
  selectedCadFaceId: string | null;
  selectedCadFaceIds: string[];
  hoveredCadFaceId: string | null;
  surfaceNodeMappings: SurfaceNodeMapping[];

  // Simulation
  simulationStatus: 'idle' | 'running' | 'completed' | 'failed';
  simulationResults: SimulationResults | null;

  // Results viewer state
  /** Current timestep for cursor sync between chart and 3D viewport (seconds) */
  currentTimestep: number;
  comparisonResults: SimulationResults | null;
  comparisonRunId: string | null;
  nodeLimits: Record<string, { minTemp: number; maxTemp: number }>;

  // What If state
  whatIfEnabled: boolean;
  whatIfDeltas: Record<string, number>; // parameterId → Δp
  whatIfSensitivityEntries: SensitivityEntry[];

  // Results viewer actions
  setCurrentTimestep: (timestep: number) => void;
  setComparisonResults: (results: SimulationResults | null) => void;
  setComparisonRunId: (runId: string | null) => void;
  setNodeLimits: (limits: Record<string, { minTemp: number; maxTemp: number }>) => void;
  setWhatIfEnabled: (enabled: boolean) => void;
  setWhatIfDeltas: (deltas: Record<string, number>) => void;
  setWhatIfSensitivityEntries: (entries: SensitivityEntry[]) => void;
  resetWhatIf: () => void;

  // Actions
  loadModel: (projectId: string, modelId: string) => Promise<void>;
  save: (snapshotDescription?: string) => Promise<void>;
  /** Create a version snapshot without full save */
  createSnapshot: (description: string) => Promise<void>;
  /** Trigger auto-save debounce */
  _scheduleAutoSave: () => void;
  /** Cleanup timers */
  cleanup: () => void;

  addNode: (node: Omit<ThermalNode, 'id'>) => void;
  updateNode: (id: string, data: Partial<ThermalNode>) => void;
  deleteNode: (id: string) => void;

  addConductor: (conductor: Omit<Conductor, 'id'>) => void;
  updateConductor: (id: string, data: Partial<Conductor>) => void;
  deleteConductor: (id: string) => void;

  addHeatLoad: (load: Omit<HeatLoad, 'id'>) => void;
  updateHeatLoad: (id: string, data: Partial<HeatLoad>) => void;
  deleteHeatLoad: (id: string) => void;

  selectNode: (id: string | null) => void;
  selectConductor: (id: string | null) => void;
  selectHeatLoad: (id: string | null) => void;
  clearSelection: () => void;

  setShowResultsOverlay: (show: boolean) => void;
  setActiveView: (view: '3d' | 'network' | 'results') => void;

  /** Push a snapshot immediately with a description */
  pushHistory: (description?: string) => void;
  /** Push a snapshot after a debounce delay (for property edits) */
  pushHistoryDebounced: (description: string) => void;
  /** Flush any pending debounced history entry immediately */
  flushDebouncedHistory: () => void;
  undo: () => void;
  redo: () => void;

  /** Whether undo is available */
  canUndo: () => boolean;
  /** Whether redo is available */
  canRedo: () => boolean;

  // CAD import actions
  setCadGeometry: (geometry: CadGeometry) => void;
  setCadImportStatus: (status: CadImportStatus) => void;
  setCadImportProgress: (progress: CadImportProgress) => void;
  clearCadGeometry: () => void;
  selectCadFace: (id: string | null) => void;
  selectCadFaceMulti: (id: string, shiftKey: boolean) => void;
  setHoveredCadFace: (id: string | null) => void;
  assignSurfacesToNode: (faceIds: string[], nodeId: string) => void;
  removeSurfaceAssignments: (faceIds: string[]) => void;
  getNodeColorForFace: (faceId: string) => string | null;
  getSurfaceProperties: (faceId: string) => { area: number; normal: [number, number, number]; centroid: [number, number, number] } | null;

  // Viewport polish
  viewportState: ViewportState;
  setRenderMode: (mode: RenderMode) => void;
  setColorScale: (scale: ColorScale) => void;
  setThermalRange: (range: Partial<ThermalRange>) => void;
  setCameraPreset: (preset: CameraPreset | null) => void;
  cameraPreset: CameraPreset | null;
  focusOnNode: (nodeId: string) => void;

  runSimulation: (config: SimulationConfig) => Promise<void>;
}

function generateId(): string {
  return crypto.randomUUID();
}

function takeSnapshot(state: { nodes: ThermalNode[]; conductors: Conductor[]; heatLoads: HeatLoad[] }): EditorSnapshot {
  return {
    nodes: structuredClone(state.nodes),
    conductors: structuredClone(state.conductors),
    heatLoads: structuredClone(state.heatLoads),
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  modelId: null,
  modelName: '',

  nodes: [],
  conductors: [],
  heatLoads: [],
  orbitalConfig: null,

  selectedNodeId: null,
  selectedConductorId: null,
  selectedHeatLoadId: null,
  showResultsOverlay: false,
  isDirty: false,
  activeView: '3d',

  autoSaveStatus: 'idle',
  lastSavedAt: null,
  _autoSaveTimer: null,
  _snapshotIntervalTimer: null,
  _lastSnapshotAt: 0,

  history: [],
  historyIndex: -1,
  _debounceTimer: null,
  _pendingDescription: null,

  cadGeometry: null,
  cadImportStatus: 'idle',
  cadImportProgress: { percent: 0, message: '' },
  selectedCadFaceId: null,
  selectedCadFaceIds: [],
  hoveredCadFaceId: null,
  surfaceNodeMappings: [],

  simulationStatus: 'idle',
  simulationResults: null,
  currentTimestep: 0,
  comparisonResults: null,
  comparisonRunId: null,
  nodeLimits: {},
  whatIfEnabled: false,
  whatIfDeltas: {},
  whatIfSensitivityEntries: [],

  setCurrentTimestep: (index) => set({ currentTimestep: index }),
  setComparisonResults: (results) => set({ comparisonResults: results }),
  setComparisonRunId: (runId) => set({ comparisonRunId: runId }),
  setNodeLimits: (limits) => set({ nodeLimits: limits }),
  setWhatIfEnabled: (enabled) => set({ whatIfEnabled: enabled }),
  setWhatIfDeltas: (deltas) => set({ whatIfDeltas: deltas }),
  setWhatIfSensitivityEntries: (entries) => set({ whatIfSensitivityEntries: entries }),
  resetWhatIf: () => set({ whatIfEnabled: false, whatIfDeltas: {}, whatIfSensitivityEntries: [] }),

  // Viewport polish
  viewportState: {
    renderMode: 'solid' as RenderMode,
    colorScale: 'rainbow' as ColorScale,
    thermalRange: { min: 150, max: 400, auto: true },
    focusTargetId: null,
  },
  cameraPreset: null,

  loadModel: async (projectId, modelId) => {
    try {
      const [modelRes, nodesRes, conductorsRes, heatLoadsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/models/${modelId}`),
        fetch(`/api/projects/${projectId}/models/${modelId}/nodes`),
        fetch(`/api/projects/${projectId}/models/${modelId}/conductors`),
        fetch(`/api/projects/${projectId}/models/${modelId}/heat-loads`),
      ]);

      const model = await modelRes.json();
      const nodes = await nodesRes.json();
      const conductors = await conductorsRes.json();
      const heatLoads = await heatLoadsRes.json();

      const positionedNodes = (Array.isArray(nodes) ? nodes : []).map(
        (node: ThermalNode, i: number) => ({
          ...node,
          x: node.x ?? 200 + (i % 5) * 160,
          y: node.y ?? 200 + Math.floor(i / 5) * 140,
        }),
      );

      const safeConductors = Array.isArray(conductors) ? conductors : [];
      const safeHeatLoads = Array.isArray(heatLoads) ? heatLoads : [];

      const initialEntry: HistoryEntry = {
        snapshot: { nodes: structuredClone(positionedNodes), conductors: structuredClone(safeConductors), heatLoads: structuredClone(safeHeatLoads) },
        description: 'Model loaded',
        timestamp: Date.now(),
      };

      // Clear existing timers
      const prev = get();
      if (prev._autoSaveTimer) clearTimeout(prev._autoSaveTimer);
      if (prev._snapshotIntervalTimer) clearInterval(prev._snapshotIntervalTimer);

      // Set up periodic snapshot timer (every 10 minutes of active editing)
      const snapshotInterval = setInterval(() => {
        const s = get();
        const timeSinceLast = Date.now() - s._lastSnapshotAt;
        if (s.isDirty && s.projectId && s.modelId && timeSinceLast > SNAPSHOT_INTERVAL_MS) {
          s.createSnapshot('Periodic auto-snapshot');
        }
      }, SNAPSHOT_INTERVAL_MS);

      set({
        projectId,
        modelId,
        modelName: model.name || 'Untitled Model',
        nodes: positionedNodes,
        conductors: safeConductors,
        heatLoads: safeHeatLoads,
        orbitalConfig: model.orbitalConfig || null,
        isDirty: false,
        autoSaveStatus: 'idle',
        lastSavedAt: null,
        _autoSaveTimer: null,
        _snapshotIntervalTimer: snapshotInterval,
        _lastSnapshotAt: Date.now(),
        history: [initialEntry],
        historyIndex: 0,
        simulationStatus: 'idle',
        simulationResults: null,
        _debounceTimer: null,
        _pendingDescription: null,
      });
    } catch (err) {
      console.error('Failed to load model:', err);
    }
  },

  save: async (snapshotDescription?: string) => {
    const { projectId, modelId, nodes, conductors, heatLoads, _autoSaveTimer } = get();
    if (!projectId || !modelId) return;

    // Clear pending auto-save since we're saving now
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);

    set({ autoSaveStatus: 'saving', _autoSaveTimer: null });

    try {
      const res = await fetch(`/api/projects/${projectId}/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          conductors,
          heatLoads,
          snapshotDescription: snapshotDescription || 'Auto-save',
          createSnapshot: true,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();

      set({
        isDirty: false,
        autoSaveStatus: 'saved',
        lastSavedAt: data.savedAt || new Date().toISOString(),
        _lastSnapshotAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to save model:', err);
      set({ autoSaveStatus: 'error' });
    }
  },

  createSnapshot: async (description: string) => {
    const { projectId, modelId, nodes, conductors, heatLoads, orbitalConfig } = get();
    if (!projectId || !modelId) return;

    try {
      await fetch(`/api/projects/${projectId}/models/${modelId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          snapshot: { nodes, conductors, heatLoads, orbitalConfig },
        }),
      });
      set({ _lastSnapshotAt: Date.now() });
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    }
  },

  _scheduleAutoSave: () => {
    const { _autoSaveTimer } = get();
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);

    const timer = setTimeout(() => {
      const s = get();
      if (s.isDirty && s.projectId && s.modelId) {
        s.save('Auto-save');
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    set({ _autoSaveTimer: timer });
  },

  cleanup: () => {
    const { _autoSaveTimer, _snapshotIntervalTimer } = get();
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    if (_snapshotIntervalTimer) clearInterval(_snapshotIntervalTimer);
    set({ _autoSaveTimer: null, _snapshotIntervalTimer: null });
  },

  // ─── Nodes ──────────────────────────────────────────────────────

  addNode: (node) => {
    const id = generateId();
    const newNode: ThermalNode = {
      ...node,
      id,
      x: node.x ?? 300 + Math.random() * 200,
      y: node.y ?? 300 + Math.random() * 200,
    };
    set((state) => ({ nodes: [...state.nodes, newNode], isDirty: true }));
    get().pushHistory(`Added node '${newNode.name}'`);
    get()._scheduleAutoSave();
  },

  updateNode: (id, data) => {
    const node = get().nodes.find((n) => n.id === id);
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on node '${node?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  deleteNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    get().flushDebouncedHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      conductors: state.conductors.filter(
        (c) => c.nodeFromId !== id && c.nodeToId !== id,
      ),
      heatLoads: state.heatLoads.filter((h) => h.nodeId !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isDirty: true,
    }));
    get().pushHistory(`Deleted node '${node?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  // ─── Conductors ─────────────────────────────────────────────────

  addConductor: (conductor) => {
    const id = generateId();
    const newCond = { ...conductor, id };
    set((state) => ({
      conductors: [...state.conductors, newCond],
      isDirty: true,
    }));
    get().pushHistory(`Added conductor '${newCond.name}'`);
    get()._scheduleAutoSave();
  },

  updateConductor: (id, data) => {
    const cond = get().conductors.find((c) => c.id === id);
    set((state) => ({
      conductors: state.conductors.map((c) => (c.id === id ? { ...c, ...data } : c)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on conductor '${cond?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  deleteConductor: (id) => {
    const cond = get().conductors.find((c) => c.id === id);
    get().flushDebouncedHistory();
    set((state) => ({
      conductors: state.conductors.filter((c) => c.id !== id),
      selectedConductorId: state.selectedConductorId === id ? null : state.selectedConductorId,
      isDirty: true,
    }));
    get().pushHistory(`Deleted conductor '${cond?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  // ─── Heat Loads ─────────────────────────────────────────────────

  addHeatLoad: (load) => {
    const id = generateId();
    const newLoad = { ...load, id };
    set((state) => ({
      heatLoads: [...state.heatLoads, newLoad],
      isDirty: true,
    }));
    get().pushHistory(`Added heat load '${newLoad.name}'`);
    get()._scheduleAutoSave();
  },

  updateHeatLoad: (id, data) => {
    const hl = get().heatLoads.find((h) => h.id === id);
    set((state) => ({
      heatLoads: state.heatLoads.map((h) => (h.id === id ? { ...h, ...data } : h)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on heat load '${hl?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  deleteHeatLoad: (id) => {
    const hl = get().heatLoads.find((h) => h.id === id);
    get().flushDebouncedHistory();
    set((state) => ({
      heatLoads: state.heatLoads.filter((h) => h.id !== id),
      selectedHeatLoadId: state.selectedHeatLoadId === id ? null : state.selectedHeatLoadId,
      isDirty: true,
    }));
    get().pushHistory(`Deleted heat load '${hl?.name ?? id.slice(0, 8)}'`);
    get()._scheduleAutoSave();
  },

  // ─── Selection ──────────────────────────────────────────────────

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedConductorId: null, selectedHeatLoadId: null }),

  selectConductor: (id) =>
    set({ selectedNodeId: null, selectedConductorId: id, selectedHeatLoadId: null }),

  selectHeatLoad: (id) =>
    set({ selectedNodeId: null, selectedConductorId: null, selectedHeatLoadId: id }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedConductorId: null, selectedHeatLoadId: null, selectedCadFaceId: null, selectedCadFaceIds: [] }),

  setShowResultsOverlay: (show) => set({ showResultsOverlay: show }),
  setActiveView: (view) => set({ activeView: view }),

  // ─── History ────────────────────────────────────────────────────

  pushHistory: (description = 'Unknown action') => {
    const state = get();
    // Clear any pending debounce
    if (state._debounceTimer) {
      clearTimeout(state._debounceTimer);
    }

    const entry: HistoryEntry = {
      snapshot: takeSnapshot(state),
      description,
      timestamp: Date.now(),
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);

    // Trim to max
    while (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      _debounceTimer: null,
      _pendingDescription: null,
    });
  },

  pushHistoryDebounced: (description: string) => {
    const state = get();

    // Clear existing timer
    if (state._debounceTimer) {
      clearTimeout(state._debounceTimer);
    }

    const timer = setTimeout(() => {
      get().pushHistory(description);
    }, DEBOUNCE_MS);

    set({ _debounceTimer: timer, _pendingDescription: description });
  },

  flushDebouncedHistory: () => {
    const { _debounceTimer, _pendingDescription } = get();
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      if (_pendingDescription) {
        // Push using current state (before the delete/add that triggered flush)
        const state = get();
        const entry: HistoryEntry = {
          snapshot: takeSnapshot(state),
          description: _pendingDescription,
          timestamp: Date.now(),
        };
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(entry);
        while (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          _debounceTimer: null,
          _pendingDescription: null,
        });
      } else {
        set({ _debounceTimer: null, _pendingDescription: null });
      }
    }
  },

  undo: () => {
    const { history, historyIndex, _debounceTimer } = get();
    // Flush any pending debounced edits first
    if (_debounceTimer) {
      get().flushDebouncedHistory();
    }
    const idx = get().historyIndex;
    if (idx <= 0) return;
    const prev = get().history[idx - 1];
    set({
      nodes: structuredClone(prev.snapshot.nodes),
      conductors: structuredClone(prev.snapshot.conductors),
      heatLoads: structuredClone(prev.snapshot.heatLoads),
      historyIndex: idx - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: structuredClone(next.snapshot.nodes),
      conductors: structuredClone(next.snapshot.conductors),
      heatLoads: structuredClone(next.snapshot.heatLoads),
      historyIndex: historyIndex + 1,
      isDirty: true,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ─── CAD Import ──────────────────────────────────────────────────

  setCadGeometry: (geometry) => set({ cadGeometry: geometry, cadImportStatus: 'done' }),
  setCadImportStatus: (status) => set({ cadImportStatus: status }),
  setCadImportProgress: (progress) => set({ cadImportProgress: progress }),
  clearCadGeometry: () => set({ cadGeometry: null, cadImportStatus: 'idle', cadImportProgress: { percent: 0, message: '' }, selectedCadFaceId: null, selectedCadFaceIds: [], hoveredCadFaceId: null, surfaceNodeMappings: [] }),
  selectCadFace: (id) => set({ selectedCadFaceId: id, selectedCadFaceIds: id ? [id] : [], selectedNodeId: null, selectedConductorId: null, selectedHeatLoadId: null }),

  selectCadFaceMulti: (id, shiftKey) => {
    if (shiftKey) {
      set((state) => {
        const ids = state.selectedCadFaceIds.includes(id)
          ? state.selectedCadFaceIds.filter((fid) => fid !== id)
          : [...state.selectedCadFaceIds, id];
        return {
          selectedCadFaceIds: ids,
          selectedCadFaceId: ids.length === 1 ? ids[0] : ids.length === 0 ? null : state.selectedCadFaceId,
          selectedNodeId: null,
          selectedConductorId: null,
          selectedHeatLoadId: null,
        };
      });
    } else {
      set({
        selectedCadFaceId: id,
        selectedCadFaceIds: [id],
        selectedNodeId: null,
        selectedConductorId: null,
        selectedHeatLoadId: null,
      });
    }
  },

  setHoveredCadFace: (id) => set({ hoveredCadFaceId: id }),

  assignSurfacesToNode: (faceIds, nodeId) => {
    set((state) => {
      // Remove existing mappings for these faces, then add new ones
      const filtered = state.surfaceNodeMappings.filter((m) => !faceIds.includes(m.faceId));
      const newMappings = [...filtered, ...faceIds.map((faceId) => ({ faceId, nodeId }))];
      return { surfaceNodeMappings: newMappings, isDirty: true };
    });
    get()._scheduleAutoSave();
  },

  removeSurfaceAssignments: (faceIds) => {
    set((state) => ({
      surfaceNodeMappings: state.surfaceNodeMappings.filter((m) => !faceIds.includes(m.faceId)),
      isDirty: true,
    }));
    get()._scheduleAutoSave();
  },

  getNodeColorForFace: (faceId) => {
    const state = get();
    const mapping = state.surfaceNodeMappings.find((m) => m.faceId === faceId);
    if (!mapping) return null;
    // Assign colors based on node order
    const nodeIds = [...new Set(state.surfaceNodeMappings.map((m) => m.nodeId))];
    const idx = nodeIds.indexOf(mapping.nodeId);
    if (idx < NODE_COLOR_PALETTE.length) {
      return NODE_COLOR_PALETTE[idx];
    }
    // HSL-based fallback for 11+ nodes — golden-angle hue spacing for visual distinction
    const hue = (idx * 137.508) % 360;
    const saturation = 65 + (idx % 3) * 10; // 65-85%
    const lightness = 50 + (idx % 2) * 10;  // 50-60%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  },

  getSurfaceProperties: (faceId) => {
    const state = get();
    if (!state.cadGeometry) return null;
    const face = state.cadGeometry.faces.find((f) => f.id === faceId);
    if (!face) return null;

    // Compute centroid and average normal from vertex data
    const positions = face.positions;
    const normals = face.normals;
    let cx = 0, cy = 0, cz = 0;
    let nx = 0, ny = 0, nz = 0;
    const vertCount = positions.length / 3;
    for (let i = 0; i < vertCount; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
      nx += normals[i * 3];
      ny += normals[i * 3 + 1];
      nz += normals[i * 3 + 2];
    }
    cx /= vertCount; cy /= vertCount; cz /= vertCount;
    // Normalize the normal
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;

    return {
      area: face.surfaceArea,
      normal: [nx, ny, nz] as [number, number, number],
      centroid: [cx, cy, cz] as [number, number, number],
    };
  },

  // ─── Viewport Polish ──────────────────────────────────────────────

  setRenderMode: (mode) => set((s) => ({ viewportState: { ...s.viewportState, renderMode: mode } })),
  setColorScale: (scale) => set((s) => ({ viewportState: { ...s.viewportState, colorScale: scale } })),
  setThermalRange: (range) => set((s) => ({
    viewportState: { ...s.viewportState, thermalRange: { ...s.viewportState.thermalRange, ...range } },
  })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  focusOnNode: (nodeId) => set((s) => ({
    viewportState: { ...s.viewportState, focusTargetId: nodeId },
    selectedNodeId: nodeId,
    selectedConductorId: null,
    selectedHeatLoadId: null,
  })),

  // ─── Simulation ─────────────────────────────────────────────────

  runSimulation: async (config) => {
    const { projectId, modelId } = get();
    if (!projectId || !modelId) return;

    // Create pre-simulation snapshot
    await get().createSnapshot('Pre-simulation snapshot');

    set({ simulationStatus: 'running' });

    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/simulate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        },
      );

      if (!res.ok) throw new Error('Simulation failed');

      const result = await res.json();

      set({
        simulationStatus: 'completed',
        simulationResults: result,
        showResultsOverlay: true,
      });
    } catch (err) {
      console.error('Simulation error:', err);
      set({ simulationStatus: 'failed' });
    }
  },
}));
