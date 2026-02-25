'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function Satellite() {
  const groupRef = useRef<THREE.Group>(null);

  /* Thermal gradient shader — vivid heat-map style */
  const bodyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorHot: { value: new THREE.Color('#FF3D00') },
        colorWarm: { value: new THREE.Color('#FF8C00') },
        colorMid: { value: new THREE.Color('#AAAAAA') },
        colorCool: { value: new THREE.Color('#0088CC') },
        colorCold: { value: new THREE.Color('#00CCFF') },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorHot;
        uniform vec3 colorWarm;
        uniform vec3 colorMid;
        uniform vec3 colorCool;
        uniform vec3 colorCold;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          // Temperature gradient based on sun direction
          vec3 sunDir = normalize(vec3(1.0, 0.3, 0.5));
          float sunFacing = dot(vNormal, sunDir) * 0.5 + 0.5;
          
          // Add position-based variation
          float posVariation = sin(vPosition.x * 3.0 + time * 0.3) * 0.08;
          float temp = clamp(sunFacing + posVariation, 0.0, 1.0);
          
          // 5-stop gradient: cold → cool → mid → warm → hot
          vec3 color;
          if (temp > 0.75) {
            color = mix(colorWarm, colorHot, (temp - 0.75) * 4.0);
          } else if (temp > 0.5) {
            color = mix(colorMid, colorWarm, (temp - 0.5) * 4.0);
          } else if (temp > 0.25) {
            color = mix(colorCool, colorMid, (temp - 0.25) * 4.0);
          } else {
            color = mix(colorCold, colorCool, temp * 4.0);
          }
          
          // Subtle fresnel rim
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          color += fresnel * 0.08;
          
          // Subtle wireframe-like edge detection
          vec3 fw = fwidth(vPosition * 4.0);
          vec3 grid = smoothstep(vec3(0.0), fw * 1.5, abs(fract(vPosition * 4.0 - 0.5) - 0.5));
          float gridLine = 1.0 - min(min(grid.x, grid.y), grid.z) * 0.15;
          color *= gridLine;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05 + 0.1;
    }
    bodyMaterial.uniforms.time.value = state.clock.elapsedTime;
  });

  /* Solar panel material — dark with subtle blue emission */
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0A0A20',
        metalness: 0.9,
        roughness: 0.15,
        emissive: '#001133',
        emissiveIntensity: 0.3,
      }),
    [],
  );

  /* Metallic structural material */
  const structMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#888888',
        metalness: 0.95,
        roughness: 0.1,
      }),
    [],
  );

  /* Gold MLI material */
  const mliMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#C8A832',
        metalness: 0.7,
        roughness: 0.3,
        emissive: '#3A2800',
        emissiveIntensity: 0.1,
      }),
    [],
  );

  return (
    <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.3}>
      <group ref={groupRef} position={[0.5, 0, 0]}>
        {/* Main body with thermal gradient */}
        <mesh material={bodyMaterial}>
          <boxGeometry args={[1.3, 1.0, 1.1]} />
        </mesh>

        {/* MLI blanket strips on body */}
        <mesh position={[0, -0.51, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.32, 0.02, 1.12]} />
          <meshStandardMaterial {...mliMat} />
        </mesh>

        {/* Solar panel left */}
        <group position={[-2.4, 0, 0]}>
          <mesh material={panelMat}>
            <boxGeometry args={[2.2, 1.2, 0.04]} />
          </mesh>
          {/* Panel cell grid */}
          {[-0.4, 0, 0.4].map((yOff) => (
            <mesh key={yOff} position={[0, yOff, 0.025]}>
              <boxGeometry args={[2.15, 0.003, 0.005]} />
              <meshBasicMaterial color="#003366" />
            </mesh>
          ))}
          {[-0.5, 0, 0.5].map((xOff) => (
            <mesh key={xOff} position={[xOff, 0, 0.025]}>
              <boxGeometry args={[0.003, 1.15, 0.005]} />
              <meshBasicMaterial color="#003366" />
            </mesh>
          ))}
        </group>

        {/* Solar panel right */}
        <group position={[2.4, 0, 0]}>
          <mesh material={panelMat}>
            <boxGeometry args={[2.2, 1.2, 0.04]} />
          </mesh>
          {[-0.4, 0, 0.4].map((yOff) => (
            <mesh key={yOff} position={[0, yOff, 0.025]}>
              <boxGeometry args={[2.15, 0.003, 0.005]} />
              <meshBasicMaterial color="#003366" />
            </mesh>
          ))}
          {[-0.5, 0, 0.5].map((xOff) => (
            <mesh key={xOff} position={[xOff, 0, 0.025]}>
              <boxGeometry args={[0.003, 1.15, 0.005]} />
              <meshBasicMaterial color="#003366" />
            </mesh>
          ))}
        </group>

        {/* Panel arms */}
        <mesh position={[-1.2, 0, 0]} material={structMat}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
        </mesh>
        <mesh position={[1.2, 0, 0]} material={structMat}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
        </mesh>

        {/* Antenna dish */}
        <mesh position={[0, 0.7, 0]} rotation={[0.25, 0, 0]} material={structMat}>
          <cylinderGeometry args={[0.35, 0.2, 0.08, 24]} />
        </mesh>
        <mesh position={[0, 0.85, 0.12]} material={structMat}>
          <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
        </mesh>

        {/* Thruster nozzles (bottom) */}
        {[[-0.35, -0.55, 0.35], [0.35, -0.55, 0.35], [-0.35, -0.55, -0.35], [0.35, -0.55, -0.35]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={structMat}>
            <cylinderGeometry args={[0.04, 0.06, 0.12, 8]} />
          </mesh>
        ))}

        {/* Radiator panels (small, on -Z face) */}
        <mesh position={[0, 0, -0.6]}>
          <boxGeometry args={[0.8, 0.6, 0.02]} />
          <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function SceneLighting() {
  return (
    <>
      {/* Ambient base */}
      <ambientLight intensity={0.08} />
      {/* Main sun directional */}
      <directionalLight position={[5, 3, 4]} intensity={1.5} color="#fff8f0" />
      {/* Rim light (back) — accent colored for drama */}
      <pointLight position={[-4, -1, -4]} intensity={0.4} color="#FF3D00" />
      {/* Fill light */}
      <pointLight position={[0, 4, 2]} intensity={0.15} color="#ffffff" />
      {/* Bottom bounce */}
      <pointLight position={[0, -3, 0]} intensity={0.05} color="#0066CC" />
    </>
  );
}

export function SatelliteScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.5, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <Satellite />
          {/* No Stars — avoiding the starfield cliché */}
          <fog attach="fog" args={['#050505', 15, 30]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
