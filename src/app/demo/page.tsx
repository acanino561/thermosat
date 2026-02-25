'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { DemoEditorLayout } from '@/components/editor/demo-editor-layout';

/**
 * Demo page — loads a 6U CubeSat thermal model with sample data.
 * No auth required. Uses the same editor components as the real editor.
 */

function generateId(): string {
  return crypto.randomUUID();
}

function useSeedDemoData() {
  const seeded = useRef(false);
  const addNode = useEditorStore((s) => s.addNode);
  const addConductor = useEditorStore((s) => s.addConductor);
  const addHeatLoad = useEditorStore((s) => s.addHeatLoad);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    // Reset store state for demo
    const store = useEditorStore.getState();

    // Generate IDs upfront so we can reference them in conductors
    const pxId = generateId();
    const nxId = generateId();
    const pyId = generateId();
    const nyId = generateId();
    const battId = generateId();
    const fcId = generateId();
    const dsId = generateId();

    // Directly set the store state with all data at once
    useEditorStore.setState({
      projectId: 'demo',
      modelId: 'demo-cubesat-6u',
      modelName: '6U CubeSat Thermal Model',
      nodes: [
        {
          id: pxId,
          name: '+X Panel',
          nodeType: 'diffusion',
          temperature: 300,
          capacitance: 150,
          area: 0.06,
          absorptivity: 0.92,
          emissivity: 0.85,
          x: 400,
          y: 150,
        },
        {
          id: nxId,
          name: '-X Panel',
          nodeType: 'diffusion',
          temperature: 280,
          capacitance: 150,
          area: 0.06,
          absorptivity: 0.92,
          emissivity: 0.85,
          x: 100,
          y: 150,
        },
        {
          id: pyId,
          name: '+Y Panel',
          nodeType: 'diffusion',
          temperature: 290,
          capacitance: 80,
          area: 0.03,
          absorptivity: 0.25,
          emissivity: 0.80,
          x: 400,
          y: 350,
        },
        {
          id: nyId,
          name: '-Y Panel',
          nodeType: 'diffusion',
          temperature: 285,
          capacitance: 80,
          area: 0.03,
          absorptivity: 0.25,
          emissivity: 0.80,
          x: 100,
          y: 350,
        },
        {
          id: battId,
          name: 'Battery Pack',
          nodeType: 'diffusion',
          temperature: 295,
          capacitance: 500,
          area: 0.01,
          absorptivity: 0.5,
          emissivity: 0.5,
          x: 250,
          y: 250,
        },
        {
          id: fcId,
          name: 'Flight Computer',
          nodeType: 'diffusion',
          temperature: 310,
          capacitance: 200,
          area: 0.005,
          absorptivity: 0.5,
          emissivity: 0.5,
          x: 250,
          y: 450,
        },
        {
          id: dsId,
          name: 'Deep Space',
          nodeType: 'boundary',
          temperature: 3,
          boundaryTemp: 3,
          x: 550,
          y: 250,
        },
      ],
      conductors: [
        {
          id: generateId(),
          name: '+X Panel → Battery',
          conductorType: 'linear',
          nodeFromId: pxId,
          nodeToId: battId,
          conductance: 0.5,
        },
        {
          id: generateId(),
          name: '-X Panel → Battery',
          conductorType: 'linear',
          nodeFromId: nxId,
          nodeToId: battId,
          conductance: 0.5,
        },
        {
          id: generateId(),
          name: '+Y Panel → Flight Computer',
          conductorType: 'linear',
          nodeFromId: pyId,
          nodeToId: fcId,
          conductance: 0.3,
        },
        {
          id: generateId(),
          name: '+X Panel → Deep Space',
          conductorType: 'radiation',
          nodeFromId: pxId,
          nodeToId: dsId,
          area: 0.06,
          viewFactor: 0.8,
          emissivity: 0.85,
        },
        {
          id: generateId(),
          name: '-X Panel → Deep Space',
          conductorType: 'radiation',
          nodeFromId: nxId,
          nodeToId: dsId,
          area: 0.06,
          viewFactor: 0.8,
          emissivity: 0.85,
        },
        {
          id: generateId(),
          name: 'Battery → Flight Computer',
          conductorType: 'linear',
          nodeFromId: battId,
          nodeToId: fcId,
          conductance: 1.0,
        },
      ],
      heatLoads: [
        {
          id: generateId(),
          name: 'Flight Computer Power',
          nodeId: fcId,
          loadType: 'constant',
          value: 5,
        },
        {
          id: generateId(),
          name: 'Battery Dissipation',
          nodeId: battId,
          loadType: 'constant',
          value: 2,
        },
      ],
      orbitalConfig: {
        altitude: 500,
        inclination: 51.6,
        raan: 0,
        epoch: '2025-01-01T00:00:00Z',
      },
      isDirty: false,
      selectedNodeId: null,
      selectedConductorId: null,
      selectedHeatLoadId: null,
      showResultsOverlay: false,
      activeView: '3d',
      history: [],
      historyIndex: -1,
      simulationStatus: 'idle',
      simulationResults: null,
    });
  }, [addNode, addConductor, addHeatLoad]);
}

export default function DemoPage() {
  useSeedDemoData();

  return <DemoEditorLayout />;
}
