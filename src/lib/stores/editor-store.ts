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

interface EditorSnapshot {
  nodes: ThermalNode[];
  conductors: Conductor[];
  heatLoads: HeatLoad[];
}

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
  activeView: '3d' | 'network';

  // History
  history: EditorSnapshot[];
  historyIndex: number;

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
  setActiveView: (view: '3d' | 'network') => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  runSimulation: (config: SimulationConfig) => Promise<void>;
}

function generateId(): string {
  return crypto.randomUUID();
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

      // Assign positions to nodes for graph visualization
      const positionedNodes = (Array.isArray(nodes) ? nodes : []).map(
        (node: ThermalNode, i: number) => ({
          ...node,
          x: node.x ?? 200 + (i % 5) * 160,
          y: node.y ?? 200 + Math.floor(i / 5) * 140,
        }),
      );

      set({
        projectId,
        modelId,
        modelName: model.name || 'Untitled Model',
        nodes: positionedNodes,
        conductors: Array.isArray(conductors) ? conductors : [],
        heatLoads: Array.isArray(heatLoads) ? heatLoads : [],
        orbitalConfig: model.orbitalConfig || null,
        isDirty: false,
        history: [{ nodes: positionedNodes, conductors: conductors, heatLoads: heatLoads }],
        historyIndex: 0,
        simulationStatus: 'idle',
        simulationResults: null,
      });
    } catch (err) {
      console.error('Failed to load model:', err);
    }
  },

  save: async () => {
    const { projectId, modelId, nodes, conductors, heatLoads } = get();
    if (!projectId || !modelId) return;

    try {
      // Save model data via API — simplified batch approach
      // In production, this would diff and send only changes
      await fetch(`/api/projects/${projectId}/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          conductors,
          heatLoads,
        }),
      });
      set({ isDirty: false });
    } catch (err) {
      console.error('Failed to save model:', err);
    }
  },

  addNode: (node) => {
    const id = generateId();
    const newNode: ThermalNode = {
      ...node,
      id,
      x: node.x ?? 300 + Math.random() * 200,
      y: node.y ?? 300 + Math.random() * 200,
    };
    set((state) => ({ nodes: [...state.nodes, newNode], isDirty: true }));
    get().pushHistory();
  },

  updateNode: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
      isDirty: true,
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      conductors: state.conductors.filter(
        (c) => c.nodeFromId !== id && c.nodeToId !== id,
      ),
      heatLoads: state.heatLoads.filter((h) => h.nodeId !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isDirty: true,
    }));
    get().pushHistory();
  },

  addConductor: (conductor) => {
    const id = generateId();
    set((state) => ({
      conductors: [...state.conductors, { ...conductor, id }],
      isDirty: true,
    }));
    get().pushHistory();
  },

  updateConductor: (id, data) => {
    set((state) => ({
      conductors: state.conductors.map((c) => (c.id === id ? { ...c, ...data } : c)),
      isDirty: true,
    }));
  },

  deleteConductor: (id) => {
    set((state) => ({
      conductors: state.conductors.filter((c) => c.id !== id),
      selectedConductorId: state.selectedConductorId === id ? null : state.selectedConductorId,
      isDirty: true,
    }));
    get().pushHistory();
  },

  addHeatLoad: (load) => {
    const id = generateId();
    set((state) => ({
      heatLoads: [...state.heatLoads, { ...load, id }],
      isDirty: true,
    }));
    get().pushHistory();
  },

  updateHeatLoad: (id, data) => {
    set((state) => ({
      heatLoads: state.heatLoads.map((h) => (h.id === id ? { ...h, ...data } : h)),
      isDirty: true,
    }));
  },

  deleteHeatLoad: (id) => {
    set((state) => ({
      heatLoads: state.heatLoads.filter((h) => h.id !== id),
      selectedHeatLoadId: state.selectedHeatLoadId === id ? null : state.selectedHeatLoadId,
      isDirty: true,
    }));
    get().pushHistory();
  },

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

  pushHistory: () => {
    const { nodes, conductors, heatLoads, history, historyIndex } = get();
    const snapshot: EditorSnapshot = {
      nodes: structuredClone(nodes),
      conductors: structuredClone(conductors),
      heatLoads: structuredClone(heatLoads),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    // Keep max 50 history entries
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      nodes: structuredClone(prev.nodes),
      conductors: structuredClone(prev.conductors),
      heatLoads: structuredClone(prev.heatLoads),
      historyIndex: historyIndex - 1,
      isDirty: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: structuredClone(next.nodes),
      conductors: structuredClone(next.conductors),
      heatLoads: structuredClone(next.heatLoads),
      historyIndex: historyIndex + 1,
      isDirty: true,
    });
  },

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

      // Poll for results if needed (simplified — assumes sync response)
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
