'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Constants ───────────────────────────────────────────────────────
// 1 unit = 1000 km, Earth radius = 6.371 units
export const EARTH_RADIUS_UNITS = 6.371;

const DAY_TEXTURE_URL =
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_atmos_2048.jpg';
const SPECULAR_TEXTURE_URL =
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_specular_2048.jpg';

// ─── Earth Sphere ────────────────────────────────────────────────────

interface EarthSphereProps {
  /** Normalized sun direction vector (unit vector pointing toward sun) */
  sunDirection?: THREE.Vector3;
}

export function EarthSphere({ sunDirection }: EarthSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  // Load textures
  const dayTexture = useLoader(THREE.TextureLoader, DAY_TEXTURE_URL);
  const specularTexture = useLoader(THREE.TextureLoader, SPECULAR_TEXTURE_URL);

  // Configure textures
  useMemo(() => {
    dayTexture.colorSpace = THREE.SRGBColorSpace;
  }, [dayTexture]);

  // Slow rotation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <group>
      {/* Main Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS_UNITS, 64, 64]} />
        <meshPhongMaterial
          map={dayTexture}
          specularMap={specularTexture}
          specular={new THREE.Color(0x333333)}
          shininess={15}
        />
      </mesh>

      {/* Atmosphere glow — slightly larger, additive blending */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[EARTH_RADIUS_UNITS * 1.025, 48, 48]} />
        <meshBasicMaterial
          color="#4fc3f7"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer atmosphere halo */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_UNITS * 1.06, 32, 32]} />
        <meshBasicMaterial
          color="#1a7aff"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
