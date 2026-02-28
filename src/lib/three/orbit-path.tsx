'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { EARTH_RADIUS_UNITS } from './earth-sphere';

// ─── Constants ───────────────────────────────────────────────────────

const MAX_ORBIT_POINTS = 360;

// ─── Orbit Path ──────────────────────────────────────────────────────

interface OrbitPathProps {
  /** Orbit altitude in km */
  altitudeKm: number;
  /** Inclination in degrees */
  inclinationDeg: number;
  /** Current orbit fraction [0, 1) for spacecraft position */
  orbitFraction: number;
}

export function OrbitPath({ altitudeKm, inclinationDeg, orbitFraction }: OrbitPathProps) {
  const markerRef = useRef<THREE.Mesh>(null);

  // Orbit radius in scene units (1 unit = 1000 km)
  const orbitRadius = EARTH_RADIUS_UNITS + altitudeKm / 1000;

  // Inclination rotation matrix
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  // Generate orbit curve points (closed loop)
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= MAX_ORBIT_POINTS; i++) {
      const angle = (i / MAX_ORBIT_POINTS) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      // Apply inclination rotation around X axis
      const y = z * Math.sin(inclinationRad);
      const zr = z * Math.cos(inclinationRad);
      pts.push([x, y, zr]);
    }
    return pts;
  }, [orbitRadius, inclinationRad]);

  // Spacecraft position on orbit
  const spacecraftPos = useMemo(() => {
    const angle = orbitFraction * Math.PI * 2;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    const y = z * Math.sin(inclinationRad);
    const zr = z * Math.cos(inclinationRad);
    return new THREE.Vector3(x, y, zr);
  }, [orbitFraction, orbitRadius, inclinationRad]);

  // Spacecraft facing direction (tangent to orbit)
  const spacecraftRotation = useMemo(() => {
    const angle = orbitFraction * Math.PI * 2;
    return new THREE.Euler(0, -angle + Math.PI / 2, 0);
  }, [orbitFraction]);

  return (
    <group>
      {/* Orbit path line */}
      <Line
        points={points}
        color="#00e5ff"
        lineWidth={0.8}
        transparent
        opacity={0.3}
        dashed
        dashSize={0.5}
        gapSize={0.25}
      />

      {/* Spacecraft marker — simplified CubeSat box */}
      <group position={spacecraftPos} rotation={spacecraftRotation}>
        <mesh ref={markerRef} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.15]} />
          <meshStandardMaterial
            color="#c0c0c0"
            emissive="#00e5ff"
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
        {/* Solar panels */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.04, 0.12, 0.14]} />
          <meshStandardMaterial
            color="#1a237e"
            emissive="#1a237e"
            emissiveIntensity={0.1}
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[0.04, 0.12, 0.14]} />
          <meshStandardMaterial
            color="#1a237e"
            emissive="#1a237e"
            emissiveIntensity={0.1}
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

// ─── Sun Light for Orbit Scene ───────────────────────────────────────

interface OrbitSunLightProps {
  /** Normalized sun direction vector */
  sunDirection: THREE.Vector3;
  /** Light intensity (0-1), faded during eclipse */
  intensity: number;
  /** Shadow map size */
  shadowMapSize?: number;
}

export function OrbitSunLight({ sunDirection, intensity, shadowMapSize = 2048 }: OrbitSunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  // Position sun light far away in the sun direction
  const sunPos = useMemo(() => {
    return sunDirection.clone().multiplyScalar(50);
  }, [sunDirection]);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(sunPos);
      lightRef.current.intensity = intensity;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[sunPos.x, sunPos.y, sunPos.z]}
      intensity={intensity}
      color="#fff5e0"
      castShadow
      shadow-mapSize-width={shadowMapSize}
      shadow-mapSize-height={shadowMapSize}
      shadow-camera-near={0.1}
      shadow-camera-far={100}
      shadow-camera-left={-15}
      shadow-camera-right={15}
      shadow-camera-top={15}
      shadow-camera-bottom={-15}
      shadow-bias={-0.0005}
    />
  );
}
