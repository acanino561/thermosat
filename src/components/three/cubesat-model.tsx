'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/stores/editor-store';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import {
  nodeProfiles,
  getAllTemperaturesAtTime,
  isInEclipse,
  ORBIT_PERIOD_MIN,
} from '@/lib/demo/simulation-data';

// ─── Constants ───────────────────────────────────────────────────────

const EARTH_RADIUS = 3;
const ORBIT_RADIUS = 4.5;
const SUN_DIRECTION = new THREE.Vector3(1, 0.3, 0).normalize();
const SUN_DISTANCE = 25;

// ─── Thermal colormap ────────────────────────────────────────────────

function temperatureToColor(temp: number): THREE.Color {
  if (temp < 200) return new THREE.Color('#0044ff');
  if (temp < 250) {
    const t = (temp - 200) / 50;
    return new THREE.Color('#0044ff').lerp(new THREE.Color('#00ccff'), t);
  }
  if (temp < 300) {
    const t = (temp - 250) / 50;
    return new THREE.Color('#00ccff').lerp(new THREE.Color('#00ff66'), t);
  }
  if (temp < 350) {
    const t = (temp - 300) / 50;
    return new THREE.Color('#00ff66').lerp(new THREE.Color('#ffcc00'), t);
  }
  const t = Math.min((temp - 350) / 50, 1);
  return new THREE.Color('#ffcc00').lerp(new THREE.Color('#ff3300'), t);
}

function tempToHex(temp: number): string {
  return '#' + temperatureToColor(temp).getHexString();
}

// ─── Orbital position helper ─────────────────────────────────────────

function getOrbitalPosition(timeMin: number): [number, number, number] {
  const angle = ((timeMin % ORBIT_PERIOD_MIN) / ORBIT_PERIOD_MIN) * Math.PI * 2;
  return [
    Math.cos(angle) * ORBIT_RADIUS,
    0,
    Math.sin(angle) * ORBIT_RADIUS,
  ];
}

// ─── Component panel ─────────────────────────────────────────────────

interface ThermalPanelProps {
  nodeIndex: number;
  temperature: number;
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
  transparent?: boolean;
  opacity?: number;
  onSelect: (nodeIndex: number) => void;
  onHover: (nodeIndex: number | null) => void;
}

function ThermalPanel({
  nodeIndex,
  temperature,
  position,
  args,
  rotation,
  transparent,
  opacity = 1,
  onSelect,
  onHover,
}: ThermalPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => temperatureToColor(temperature), [temperature]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation ? new THREE.Euler(...rotation) : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(nodeIndex);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(nodeIndex);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        roughness={0.4}
        metalness={0.6}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

// ─── Earth ───────────────────────────────────────────────────────────

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial
        color="#1a5276"
        emissive="#0a2a40"
        emissiveIntensity={0.15}
        roughness={0.8}
        metalness={0.1}
      />
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.02, 32, 32]} />
        <meshBasicMaterial
          color="#4fc3f7"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </mesh>
  );
}

// ─── Sun indicator ───────────────────────────────────────────────────

function SunIndicator({ inEclipse }: { inEclipse: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const sunPos: [number, number, number] = [
    SUN_DIRECTION.x * SUN_DISTANCE,
    SUN_DIRECTION.y * SUN_DISTANCE,
    SUN_DIRECTION.z * SUN_DISTANCE,
  ];

  useFrame((state) => {
    if (meshRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={sunPos}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial
          color={inEclipse ? '#443300' : '#ffdd00'}
          transparent
          opacity={inEclipse ? 0.3 : 1}
        />
      </mesh>
      {/* Glow */}
      {!inEclipse && (
        <mesh>
          <sphereGeometry args={[2.0, 16, 16]} />
          <meshBasicMaterial
            color="#ffaa00"
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        </mesh>
      )}
      <Html position={[0, 2.0, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-[9px] font-mono text-yellow-400/60 whitespace-nowrap">
          {inEclipse ? '☀ ECLIPSE' : '☀ SUNLIT'}
        </div>
      </Html>
    </group>
  );
}

// ─── Orbit path ──────────────────────────────────────────────────────

function OrbitPath() {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push([
        Math.cos(angle) * ORBIT_RADIUS,
        0,
        Math.sin(angle) * ORBIT_RADIUS,
      ]);
    }
    return pts;
  }, []);

  return (
    <Line
      points={points}
      color="#00e5ff"
      lineWidth={0.5}
      transparent
      opacity={0.25}
      dashed
      dashSize={0.3}
      gapSize={0.15}
    />
  );
}

// ─── Satellite position marker on orbit ──────────────────────────────

function SatelliteMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#00e5ff" />
    </mesh>
  );
}

// ─── HUD readouts on the model ───────────────────────────────────────

interface HUDReadoutProps {
  position: [number, number, number];
  name: string;
  temp: number;
  visible: boolean;
}

function HUDReadout({ position, name, temp, visible }: HUDReadoutProps) {
  if (!visible) return null;
  return (
    <Html position={position} center style={{ pointerEvents: 'none' }} distanceFactor={15}>
      <div
        className="px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap"
        style={{
          background: 'rgba(0,0,0,0.8)',
          border: `1px solid ${tempToHex(temp)}44`,
          color: tempToHex(temp),
          textShadow: `0 0 4px ${tempToHex(temp)}`,
        }}
      >
        {temp.toFixed(0)}K
      </div>
    </Html>
  );
}

// ─── Main CubeSat Model ──────────────────────────────────────────────

export function CubeSatModel() {
  const nodes = useEditorStore((s) => s.nodes);
  const selectNode = useEditorStore((s) => s.selectNode);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const currentIndex = useTimelineStore((s) => s.currentIndex);
  const currentTime = useTimelineStore((s) => s.currentTime);

  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Get current temperatures
  const temperatures = useMemo(
    () => getAllTemperaturesAtTime(currentIndex),
    [currentIndex],
  );

  const eclipse = useMemo(() => isInEclipse(currentTime), [currentTime]);

  // Satellite orbital position (driven by timeline)
  const satPosition = useMemo(
    () => getOrbitalPosition(currentTime),
    [currentTime],
  );

  // Satellite facing direction: tangent to orbit (velocity direction)
  const satRotationY = useMemo(() => {
    const angle = ((currentTime % ORBIT_PERIOD_MIN) / ORBIT_PERIOD_MIN) * Math.PI * 2;
    // Tangent direction: perpendicular to radius, pointing forward along orbit
    return -angle + Math.PI / 2;
  }, [currentTime]);

  // Map node index → node id for selection
  const handleSelect = useCallback(
    (nodeIndex: number) => {
      if (nodeIndex >= 0 && nodeIndex < nodes.length) {
        selectNode(nodes[nodeIndex].id);
      }
    },
    [nodes, selectNode],
  );

  const handleHover = useCallback((nodeIndex: number | null) => {
    setHoveredNode(nodeIndex);
  }, []);

  // CubeSat dimensions (6U ≈ 10×20×30 cm, scaled up for visibility)
  const bodyW = 0.3;
  const bodyH = 0.6;
  const bodyD = 0.9;

  // Sun light position
  const sunLightPos: [number, number, number] = [
    SUN_DIRECTION.x * SUN_DISTANCE,
    SUN_DIRECTION.y * SUN_DISTANCE,
    SUN_DIRECTION.z * SUN_DISTANCE,
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={eclipse ? 0.08 : 0.2} />
      <directionalLight
        position={sunLightPos}
        intensity={eclipse ? 0.05 : 1.0}
        color="#fff5e0"
        castShadow
      />
      <directionalLight
        position={[-5, -3, 5]}
        intensity={0.1}
        color="#4488cc"
      />
      <pointLight
        position={satPosition}
        intensity={eclipse ? 0.02 : 0.1}
        color="#00e5ff"
        distance={3}
      />

      {/* Environment */}
      <Earth />
      <SunIndicator inEclipse={eclipse} />
      <OrbitPath />
      <SatelliteMarker position={satPosition} />

      {/* Eclipse shadow effect around satellite */}
      {eclipse && (
        <mesh position={satPosition}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* CubeSat group — positioned on orbit */}
      <group
        ref={groupRef}
        position={satPosition}
        rotation={[0, satRotationY, 0]}
      >
        {/* Main bus body — slightly transparent to see internals */}
        <ThermalPanel
          nodeIndex={0}
          temperature={temperatures[0]}
          position={[0, 0, 0]}
          args={[bodyW, bodyH, bodyD]}
          transparent
          opacity={0.7}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* Wireframe overlay on body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[bodyW + 0.01, bodyH + 0.01, bodyD + 0.01]} />
          <meshBasicMaterial
            color={tempToHex(temperatures[0])}
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>

        {/* +X face panel (right side) */}
        <ThermalPanel
          nodeIndex={0}
          temperature={temperatures[0]}
          position={[bodyW / 2 + 0.02, 0, 0]}
          args={[0.02, bodyH * 0.9, bodyD * 0.9]}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* -X face panel (left side) */}
        <ThermalPanel
          nodeIndex={1}
          temperature={temperatures[1]}
          position={[-bodyW / 2 - 0.02, 0, 0]}
          args={[0.02, bodyH * 0.9, bodyD * 0.9]}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* +Y Solar panel (deployable — right wing) */}
        <group position={[0, bodyH / 2 + 0.02, 0]}>
          {/* Hinge */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, bodyD * 0.8, 8]} />
            <meshStandardMaterial color="#444" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Panel */}
          <ThermalPanel
            nodeIndex={2}
            temperature={temperatures[2]}
            position={[0, 0.35, 0]}
            args={[bodyW * 0.8, 0.65, bodyD * 0.95]}
            rotation={[0, 0, 0.08]}
            onSelect={handleSelect}
            onHover={handleHover}
          />
          {/* Solar cell grid lines */}
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[bodyW * 0.81, 0.66, bodyD * 0.96]} />
            <meshBasicMaterial
              color="#223344"
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>

        {/* -Y Solar panel (deployable — left wing) */}
        <group position={[0, -bodyH / 2 - 0.02, 0]}>
          {/* Hinge */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, bodyD * 0.8, 8]} />
            <meshStandardMaterial color="#444" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Panel */}
          <ThermalPanel
            nodeIndex={3}
            temperature={temperatures[3]}
            position={[0, -0.35, 0]}
            args={[bodyW * 0.8, 0.65, bodyD * 0.95]}
            rotation={[0, 0, -0.08]}
            onSelect={handleSelect}
            onHover={handleHover}
          />
          <mesh position={[0, -0.35, 0]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[bodyW * 0.81, 0.66, bodyD * 0.96]} />
            <meshBasicMaterial
              color="#223344"
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>

        {/* Battery Pack — visible inside body */}
        <ThermalPanel
          nodeIndex={4}
          temperature={temperatures[4]}
          position={[0, -0.1, -0.12]}
          args={[bodyW * 0.6, bodyH * 0.35, bodyD * 0.3]}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* Flight Computer — visible inside body */}
        <ThermalPanel
          nodeIndex={5}
          temperature={temperatures[5]}
          position={[0, 0.1, 0.1]}
          args={[bodyW * 0.55, bodyH * 0.25, bodyD * 0.25]}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* Antenna on +Z face (cylinder + cone) */}
        <group position={[0, 0, bodyD / 2 + 0.03]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.05, 0.1, 8]} />
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* Star tracker on -Z face */}
        <group position={[0.06, 0.06, -bodyD / 2 - 0.03]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Lens */}
          <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.025, 16]} />
            <meshStandardMaterial
              color="#112244"
              emissive="#001133"
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* HUD temperature readouts */}
        <HUDReadout
          position={[bodyW / 2 + 0.3, 0, 0]}
          name="+X"
          temp={temperatures[0]}
          visible={true}
        />
        <HUDReadout
          position={[-bodyW / 2 - 0.3, 0, 0]}
          name="-X"
          temp={temperatures[1]}
          visible={true}
        />
        <HUDReadout
          position={[0, bodyH / 2 + 0.8, 0]}
          name="+Y"
          temp={temperatures[2]}
          visible={true}
        />
        <HUDReadout
          position={[0, -bodyH / 2 - 0.8, 0]}
          name="-Y"
          temp={temperatures[3]}
          visible={true}
        />
        <HUDReadout
          position={[bodyW / 2 + 0.3, -0.1, -0.12]}
          name="BAT"
          temp={temperatures[4]}
          visible={true}
        />
        <HUDReadout
          position={[bodyW / 2 + 0.3, 0.1, 0.1]}
          name="FC"
          temp={temperatures[5]}
          visible={true}
        />
      </group>

      {/* Hover tooltip */}
      {hoveredNode !== null && hoveredNode < nodeProfiles.length && (
        <Html position={satPosition} center style={{ pointerEvents: 'none' }}>
          <div
            className="px-3 py-2 rounded-md text-[11px] font-mono shadow-2xl whitespace-nowrap"
            style={{
              background: 'rgba(5,10,20,0.95)',
              border: `1px solid ${tempToHex(temperatures[hoveredNode])}55`,
              color: '#e2e8f0',
              backdropFilter: 'blur(12px)',
              transform: 'translateY(-40px)',
            }}
          >
            <div className="font-semibold mb-0.5" style={{ color: tempToHex(temperatures[hoveredNode]) }}>
              {nodeProfiles[hoveredNode].name}
            </div>
            <div className="text-[10px]">
              <span style={{ color: tempToHex(temperatures[hoveredNode]) }}>
                {temperatures[hoveredNode].toFixed(1)}K
              </span>
              <span className="text-slate-500 ml-2">
                ({(temperatures[hoveredNode] - 273.15).toFixed(1)}°C)
              </span>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
