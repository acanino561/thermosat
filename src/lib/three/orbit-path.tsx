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

// ─── Mini CubeSat (standalone, no store dependencies) ────────────────

function MiniCubeSat() {
  const scale = 0.05;
  return (
    <group scale={[scale, scale, scale]}>
      {/* Main bus body */}
      <mesh castShadow>
        <boxGeometry args={[6, 12, 18]} />
        <meshStandardMaterial
          color="#c0c0c0"
          emissive="#00e5ff"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      {/* +Y Solar panel */}
      <mesh position={[0, 10, 0]} castShadow>
        <boxGeometry args={[5, 8, 16]} />
        <meshStandardMaterial
          color="#1a237e"
          emissive="#1a237e"
          emissiveIntensity={0.1}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>
      {/* -Y Solar panel */}
      <mesh position={[0, -10, 0]} castShadow>
        <boxGeometry args={[5, 8, 16]} />
        <meshStandardMaterial
          color="#1a237e"
          emissive="#1a237e"
          emissiveIntensity={0.1}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

export function OrbitPath({ altitudeKm, inclinationDeg, orbitFraction }: OrbitPathProps) {
  // Orbit radius in scene units (1 unit = 1000 km)
  const orbitRadius = EARTH_RADIUS_UNITS + altitudeKm / 1000;

  // Inclination rotation matrix
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  // Generate orbit curve using CatmullRomCurve3
  const curve = useMemo(() => {
    const pts = Array.from({ length: MAX_ORBIT_POINTS }, (_, i) => {
      const angle = (i / MAX_ORBIT_POINTS) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const y = z * Math.sin(inclinationRad);
      const zr = z * Math.cos(inclinationRad);
      return new THREE.Vector3(x, y, zr);
    });
    return new THREE.CatmullRomCurve3(pts, true);
  }, [orbitRadius, inclinationRad]);

  // Get line points from curve
  const linePoints = useMemo(() => {
    return curve.getPoints(MAX_ORBIT_POINTS).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [curve]);

  // Spacecraft position on orbit via curve interpolation
  const spacecraftPos = useMemo(() => {
    return curve.getPointAt(orbitFraction % 1);
  }, [curve, orbitFraction]);

  // Spacecraft facing direction (tangent to orbit)
  const spacecraftRotation = useMemo(() => {
    const angle = orbitFraction * Math.PI * 2;
    return new THREE.Euler(0, -angle + Math.PI / 2, 0);
  }, [orbitFraction]);

  return (
    <group>
      {/* Orbit path line */}
      <Line
        points={linePoints}
        color="#00e5ff"
        lineWidth={0.8}
        transparent
        opacity={0.3}
        dashed
        dashSize={0.5}
        gapSize={0.25}
      />

      {/* Spacecraft marker — MiniCubeSat */}
      <group position={spacecraftPos} rotation={spacecraftRotation}>
        <MiniCubeSat />
      </group>
    </group>
  );
}

// ─── Sun Sphere (visible sun in scene) ───────────────────────────────

interface SunSphereProps {
  /** Normalized sun direction vector */
  sunDirection: THREE.Vector3;
}

export function SunSphere({ sunDirection }: SunSphereProps) {
  const position = useMemo(() => {
    return sunDirection.clone().multiplyScalar(50);
  }, [sunDirection]);

  return (
    <group position={position}>
      {/* Core sun sphere */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>

      {/* Corona glow */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial
          color="#FF8C00"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
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
