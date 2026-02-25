'use client';

import { useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls,
  Html,
  Line,
  GradientTexture,
} from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore, ThermalNode, Conductor, HeatLoad } from '@/lib/stores/editor-store';

// ─── Constants ──────────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, string> = {
  diffusion: '#3b82f6',
  arithmetic: '#06b6d4',
  boundary: '#f97316',
};

const CONDUCTOR_TYPE_COLORS: Record<string, string> = {
  linear: '#64748b',
  radiation: '#f97316',
  contact: '#a855f7',
};

function getTemperatureColor(temp: number): string {
  if (temp < 200) return '#0066ff';
  if (temp <= 350) {
    // Interpolate blue → green → orange
    const t = (temp - 200) / 150;
    if (t < 0.5) {
      const f = t * 2;
      return lerpColor('#0066ff', '#00ff66', f);
    }
    const f = (t - 0.5) * 2;
    return lerpColor('#00ff66', '#ff9900', f);
  }
  return '#ff3300';
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
}

// ─── 3D Layout ──────────────────────────────────────────────────────────

function computeNodePositions(nodes: ThermalNode[]): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>();
  const count = nodes.length;
  if (count === 0) return positions;

  // Fibonacci sphere distribution for nice 3D spread
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = Math.max(3, Math.cbrt(count) * 2.5);

  nodes.forEach((node, i) => {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    positions.set(node.id, new THREE.Vector3(x * radius, y * radius, z * radius));
  });

  return positions;
}

// ─── ThermalNodeMesh ────────────────────────────────────────────────────

interface ThermalNodeMeshProps {
  node: ThermalNode;
  position: THREE.Vector3;
  isSelected: boolean;
  hasResults: boolean;
  finalTemp: number | null;
  hasHeatLoad: boolean;
  heatLoadType: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null, event?: ThreeEvent<PointerEvent>) => void;
}

function ThermalNodeMesh({
  node,
  position,
  isSelected,
  hasResults,
  finalTemp,
  hasHeatLoad,
  heatLoadType,
  onSelect,
  onHover,
}: ThermalNodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    if (hasResults && finalTemp !== null) {
      return getTemperatureColor(finalTemp);
    }
    return NODE_TYPE_COLORS[node.nodeType] || '#666666';
  }, [hasResults, finalTemp, node.nodeType]);

  const scale = useMemo(() => {
    if (node.nodeType === 'diffusion') {
      const cap = node.capacitance ?? 100;
      return 0.3 + Math.min(Math.log10(cap + 1) * 0.15, 0.5);
    }
    if (node.nodeType === 'arithmetic') return 0.3;
    return 0.45; // boundary
  }, [node.nodeType, node.capacitance]);

  // Gentle hover pulse
  useFrame((state) => {
    if (glowRef.current && isSelected) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
      glowRef.current.scale.setScalar(s);
    }
  });

  const geometry = useMemo(() => {
    switch (node.nodeType) {
      case 'diffusion':
        return <sphereGeometry args={[scale, 24, 24]} />;
      case 'arithmetic':
        return <octahedronGeometry args={[scale, 0]} />;
      case 'boundary':
        return <boxGeometry args={[scale * 1.4, scale * 1.4, scale * 1.4]} />;
      default:
        return <sphereGeometry args={[scale, 16, 16]} />;
    }
  }, [node.nodeType, scale]);

  return (
    <group position={position}>
      {/* Selection glow */}
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[scale * 2.2, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Main node */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node.id, e);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : 0.15}
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        {geometry}
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={isSelected ? 0.5 : 0.15}
        />
      </mesh>

      {/* Heat load indicator — small cone arrow */}
      {hasHeatLoad && (
        <mesh position={[0, scale + 0.35, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.12, 0.35, 8]} />
          <meshStandardMaterial
            color={heatLoadType === 'orbital' ? '#00e5ff' : '#fbbf24'}
            emissive={heatLoadType === 'orbital' ? '#00e5ff' : '#fbbf24'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* Label */}
      <Html
        center
        distanceFactor={12}
        position={[0, -(scale + 0.4), 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="whitespace-nowrap text-center select-none" style={{ transform: 'translateY(4px)' }}>
          <div
            className="text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded"
            style={{
              color: '#e2e8f0',
              background: 'rgba(0,0,0,0.7)',
              border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {node.name}
            {(hasResults && finalTemp !== null) && (
              <span className="ml-1.5" style={{ color: getTemperatureColor(finalTemp) }}>
                {finalTemp.toFixed(1)}K
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── ConductorLine ──────────────────────────────────────────────────────

interface ConductorLineProps {
  conductor: Conductor;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ConductorLine({ conductor, fromPos, toPos, isSelected, onSelect }: ConductorLineProps) {
  const color = isSelected
    ? '#22c55e'
    : CONDUCTOR_TYPE_COLORS[conductor.conductorType] || '#64748b';

  const lineWidth = conductor.conductorType === 'contact' ? 3 : isSelected ? 2.5 : 1.5;
  const dashed = conductor.conductorType === 'radiation';

  const points = useMemo(() => [fromPos, toPos], [fromPos, toPos]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashed ? 0.3 : undefined}
      gapSize={dashed ? 0.15 : undefined}
      transparent
      opacity={isSelected ? 1 : 0.5}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(conductor.id);
      }}
    />
  );
}

// ─── Grid Floor ─────────────────────────────────────────────────────────

function GridFloor() {
  return (
    <group position={[0, -6, 0]}>
      <gridHelper
        args={[40, 40, '#1a2a3a', '#0d1520']}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#060d14"
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// ─── Coordinate Axes ────────────────────────────────────────────────────

function CoordinateAxes() {
  return (
    <group position={[-8, -5.9, -8]}>
      <Line points={[[0, 0, 0], [2, 0, 0]]} color="#ff3355" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 2, 0]]} color="#33ff55" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, 2]]} color="#3355ff" lineWidth={2} />
      <Html position={[2.3, 0, 0]} style={{ pointerEvents: 'none' }}>
        <span className="text-[9px] font-mono text-red-400">X</span>
      </Html>
      <Html position={[0, 2.3, 0]} style={{ pointerEvents: 'none' }}>
        <span className="text-[9px] font-mono text-green-400">Y</span>
      </Html>
      <Html position={[0, 0, 2.3]} style={{ pointerEvents: 'none' }}>
        <span className="text-[9px] font-mono text-blue-400">Z</span>
      </Html>
    </group>
  );
}

// ─── Scene Contents ─────────────────────────────────────────────────────

function SceneContents() {
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);
  const heatLoads = useEditorStore((s) => s.heatLoads);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedConductorId = useEditorStore((s) => s.selectedConductorId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const selectConductor = useEditorStore((s) => s.selectConductor);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const showResultsOverlay = useEditorStore((s) => s.showResultsOverlay);
  const simulationResults = useEditorStore((s) => s.simulationResults);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodePositions = useMemo(() => computeNodePositions(nodes), [nodes]);

  const hasResults = showResultsOverlay && simulationResults !== null;

  const getFinalTemp = useCallback(
    (nodeId: string): number | null => {
      if (!hasResults || !simulationResults) return null;
      const res = simulationResults.nodeResults[nodeId];
      if (!res || res.temperatures.length === 0) return null;
      return res.temperatures[res.temperatures.length - 1];
    },
    [hasResults, simulationResults],
  );

  const heatLoadMap = useMemo(() => {
    const map = new Map<string, HeatLoad>();
    heatLoads.forEach((hl) => map.set(hl.nodeId, hl));
    return map;
  }, [heatLoads]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredNodeId(id);
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} color="#e8eef6" />
      <directionalLight position={[-5, -5, -5]} intensity={0.15} color="#4488cc" />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#00e5ff" distance={25} />

      {/* Background click to deselect */}
      <mesh
        position={[0, 0, -20]}
        onClick={() => clearSelection()}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      {/* Grid + axes */}
      <GridFloor />
      <CoordinateAxes />

      {/* Conductors */}
      {conductors.map((cond) => {
        const fromPos = nodePositions.get(cond.nodeFromId);
        const toPos = nodePositions.get(cond.nodeToId);
        if (!fromPos || !toPos) return null;
        return (
          <ConductorLine
            key={cond.id}
            conductor={cond}
            fromPos={fromPos}
            toPos={toPos}
            isSelected={selectedConductorId === cond.id}
            onSelect={selectConductor}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return null;
        const hl = heatLoadMap.get(node.id);
        return (
          <ThermalNodeMesh
            key={node.id}
            node={node}
            position={pos}
            isSelected={selectedNodeId === node.id}
            hasResults={hasResults}
            finalTemp={getFinalTemp(node.id)}
            hasHeatLoad={!!hl}
            heatLoadType={hl?.loadType ?? null}
            onSelect={selectNode}
            onHover={handleHover}
          />
        );
      })}

      {/* Hover tooltip */}
      {hoveredNodeId && (() => {
        const hNode = nodes.find((n) => n.id === hoveredNodeId);
        const hPos = nodePositions.get(hoveredNodeId);
        if (!hNode || !hPos) return null;
        const temp = getFinalTemp(hoveredNodeId) ?? hNode.temperature;
        return (
          <Html position={[hPos.x, hPos.y + 1.2, hPos.z]} center style={{ pointerEvents: 'none' }}>
            <div
              className="px-2.5 py-1.5 rounded text-[11px] font-mono shadow-xl whitespace-nowrap"
              style={{
                background: 'rgba(5,10,20,0.92)',
                border: '1px solid rgba(0,229,255,0.3)',
                color: '#e2e8f0',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="font-semibold" style={{ color: '#00e5ff' }}>{hNode.name}</div>
              <div className="text-[10px] mt-0.5">
                <span className="text-slate-400">{hNode.nodeType}</span>
                <span className="mx-1.5 text-slate-600">│</span>
                <span style={{ color: getTemperatureColor(temp) }}>{temp.toFixed(1)}K</span>
              </div>
            </div>
          </Html>
        );
      })()}

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={50}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

// ─── Viewport3D (exported) ──────────────────────────────────────────────

export function Viewport3D() {
  const nodes = useEditorStore((s) => s.nodes);

  return (
    <div className="h-full w-full relative bg-[#030810] overflow-hidden">
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: '#030810' }}
        onPointerMissed={() => {
          useEditorStore.getState().clearSelection();
        }}
      >
        <color attach="background" args={['#030810']} />
        <fog attach="fog" args={['#030810', 30, 60]} />
        <Suspense fallback={null}>
          <SceneContents />
        </Suspense>
      </Canvas>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-muted-foreground text-sm font-mono">No nodes in model</div>
            <div className="text-muted-foreground/50 text-xs mt-1 font-mono">
              Add nodes using the toolbar above
            </div>
          </div>
        </div>
      )}

      {/* Node count badge */}
      {nodes.length > 0 && (
        <div
          className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-1 rounded"
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: 'rgba(148,163,184,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {nodes.length} nodes · 3D
        </div>
      )}
    </div>
  );
}
