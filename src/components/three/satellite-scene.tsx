'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Satellite() {
  const groupRef = useRef<THREE.Group>(null);

  // Thermal gradient material — hot (orange/red) to cold (blue)
  const bodyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorHot: { value: new THREE.Color('#f97316') },
        colorWarm: { value: new THREE.Color('#ef4444') },
        colorCool: { value: new THREE.Color('#3b82f6') },
        colorCold: { value: new THREE.Color('#06b6d4') },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorHot;
        uniform vec3 colorWarm;
        uniform vec3 colorCool;
        uniform vec3 colorCold;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          float gradient = (vPosition.y + 1.0) / 2.0;
          gradient += sin(time * 0.5 + vPosition.x * 3.0) * 0.1;
          gradient = clamp(gradient, 0.0, 1.0);
          vec3 color;
          if (gradient > 0.66) {
            color = mix(colorWarm, colorHot, (gradient - 0.66) * 3.0);
          } else if (gradient > 0.33) {
            color = mix(colorCool, colorWarm, (gradient - 0.33) * 3.0);
          } else {
            color = mix(colorCold, colorCool, gradient * 3.0);
          }
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          color += fresnel * 0.15;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
    bodyMaterial.uniforms.time.value = state.clock.elapsedTime;
  });

  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1a3e',
        metalness: 0.8,
        roughness: 0.2,
        emissive: '#3b82f6',
        emissiveIntensity: 0.15,
      }),
    [],
  );

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef}>
        {/* Main body */}
        <mesh material={bodyMaterial}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
        </mesh>

        {/* Solar panel left */}
        <mesh position={[-2.2, 0, 0]} material={panelMat}>
          <boxGeometry args={[2, 1.4, 0.05]} />
        </mesh>
        {/* Solar panel grid lines left */}
        <mesh position={[-2.2, 0, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[-2.2, 0.35, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[-2.2, -0.35, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Solar panel right */}
        <mesh position={[2.2, 0, 0]} material={panelMat}>
          <boxGeometry args={[2, 1.4, 0.05]} />
        </mesh>
        {/* Solar panel grid lines right */}
        <mesh position={[2.2, 0, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[2.2, 0.35, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[2.2, -0.35, 0.03]}>
          <boxGeometry args={[1.95, 0.005, 0.01]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>

        {/* Antenna dish */}
        <mesh position={[0, 0.9, 0]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.25, 0.1, 16]} />
          <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.0, 0.15]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Panel arms */}
        <mesh position={[-1.1, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.08]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[1.1, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.08]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
            float diffuse = max(dot(vNormal, lightDir), 0.0);
            vec3 oceanColor = vec3(0.05, 0.15, 0.35);
            vec3 landColor = vec3(0.08, 0.25, 0.12);
            float landMask = step(0.5, fract(sin(dot(vPosition.xy * 3.0, vec2(12.9898, 78.233))) * 43758.5453));
            vec3 baseColor = mix(oceanColor, landColor, landMask * 0.5);
            vec3 color = baseColor * (0.3 + diffuse * 0.7);
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
            color += vec3(0.2, 0.5, 1.0) * fresnel * 0.4;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    [],
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <group position={[3, -4, -10]}>
      {/* Earth */}
      <mesh ref={meshRef} material={material}>
        <sphereGeometry args={[5, 64, 64]} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[5.15, 64, 64]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.3, 64, 64]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fff5e6" />
      <pointLight position={[-5, -2, 3]} intensity={0.3} color="#3b82f6" />
      <pointLight position={[0, 3, -2]} intensity={0.2} color="#06b6d4" />
    </>
  );
}

export function SatelliteScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <Satellite />
          <Earth />
          <Stars
            radius={100}
            depth={60}
            count={4000}
            factor={4}
            saturation={0.2}
            fade
            speed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
