import { create } from 'zustand';

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

export interface Conductor {
  id: string;
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact';
  nodeFromId: string;
  nodeToId: string;
  conductance?: number | null;
  area?: number | null;
  viewFactor?: number | null;
  emissivity?: number | null;
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
  altitude: number;
  inclination: number;
  raan: number;
  epoch: string;
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

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  /** Timer id for debounced property edits */
  _debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Pending description for debounced push */
  _pendingDescription: string | null;

  // Simulation
  simulationStatus: 'idle' | 'running' | 'completed' | 'failed';
  simulationResults: SimulationResults | null;

  // Actions
  loadModel: (projectId: string, modelId: string) => Promise<void>;
  save: () => Promise<void>;

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

  history: [],
  historyIndex: -1,
  _debounceTimer: null,
  _pendingDescription: null,

  simulationStatus: 'idle',
  simulationResults: null,

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

      set({
        projectId,
        modelId,
        modelName: model.name || 'Untitled Model',
        nodes: positionedNodes,
        conductors: safeConductors,
        heatLoads: safeHeatLoads,
        orbitalConfig: model.orbitalConfig || null,
        isDirty: false,
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

  save: async () => {
    const { projectId, modelId, nodes, conductors, heatLoads } = get();
    if (!projectId || !modelId) return;

    try {
      await fetch(`/api/projects/${projectId}/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, conductors, heatLoads }),
      });
      set({ isDirty: false });
    } catch (err) {
      console.error('Failed to save model:', err);
    }
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
  },

  updateNode: (id, data) => {
    const node = get().nodes.find((n) => n.id === id);
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on node '${node?.name ?? id.slice(0, 8)}'`);
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
  },

  updateConductor: (id, data) => {
    const cond = get().conductors.find((c) => c.id === id);
    set((state) => ({
      conductors: state.conductors.map((c) => (c.id === id ? { ...c, ...data } : c)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on conductor '${cond?.name ?? id.slice(0, 8)}'`);
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
  },

  updateHeatLoad: (id, data) => {
    const hl = get().heatLoads.find((h) => h.id === id);
    set((state) => ({
      heatLoads: state.heatLoads.map((h) => (h.id === id ? { ...h, ...data } : h)),
      isDirty: true,
    }));
    const changedFields = Object.keys(data).join(', ');
    get().pushHistoryDebounced(`Changed ${changedFields} on heat load '${hl?.name ?? id.slice(0, 8)}'`);
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
  },

  // ─── Selection ──────────────────────────────────────────────────

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedConductorId: null, selectedHeatLoadId: null }),

  selectConductor: (id) =>
    set({ selectedNodeId: null, selectedConductorId: id, selectedHeatLoadId: null }),

  selectHeatLoad: (id) =>
    set({ selectedNodeId: null, selectedConductorId: null, selectedHeatLoadId: id }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedConductorId: null, selectedHeatLoadId: null }),

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

  // ─── Simulation ─────────────────────────────────────────────────

  runSimulation: async (config) => {
    const { projectId, modelId } = get();
    if (!projectId || !modelId) return;

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
