'use client';

import { useRef, useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { Globe, Video, Square, Download } from 'lucide-react';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { useEditorStore } from '@/lib/stores/editor-store';
import { EarthSphere, EARTH_RADIUS_UNITS } from '@/lib/three/earth-sphere';
import { OrbitPath, OrbitSunLight, SunSphere } from '@/lib/three/orbit-path';
import { configureShadows, checkFps, SHADOW_MAP_SIZE_HIGH, SHADOW_MAP_SIZE_LOW } from '@/lib/three/shadow-config';
import {
  ORBIT_PERIOD_MIN,
  isInEclipse,
  eclipsePeriods,
} from '@/lib/demo/simulation-data';
import { computeSunDirectionAtTime } from '@/lib/solver/orbital-environment';
import type { OrbitalConfig } from '@/lib/solver/types';
import { cn } from '@/lib/utils';

// ─── FPS Monitor & Shadow Downgrade ─────────────────────────────────

function FpsMonitor({ onShadowDowngrade }: { onShadowDowngrade: (size: number) => void }) {
  const frameCount = useRef(0);
  const elapsed = useRef(0);
  const downgraded = useRef(false);

  useFrame((_, delta) => {
    frameCount.current++;
    elapsed.current += delta;

    if (elapsed.current >= 1) {
      const fps = frameCount.current / elapsed.current;
      if (!downgraded.current) {
        const { shouldDowngrade, recommendedSize } = checkFps(fps);
        if (shouldDowngrade) {
          onShadowDowngrade(recommendedSize);
          downgraded.current = true;
        }
      }
      frameCount.current = 0;
      elapsed.current = 0;
    }
  });

  return null;
}

// ─── Shadow Initializer ─────────────────────────────────────────────

function ShadowInitializer() {
  const { gl } = useThree();
  useEffect(() => {
    configureShadows(gl);
  }, [gl]);
  return null;
}

// ─── Eclipse Transition Helper ──────────────────────────────────────

function useEclipseIntensity(currentTime: number) {
  const intensityRef = useRef(1.0);
  const eclipse = isInEclipse(currentTime);

  useFrame((_, delta) => {
    const target = eclipse ? 0.05 : 1.0;
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, target, delta * 3);
  });

  return { intensity: intensityRef, isEclipse: eclipse };
}

// ─── Sun Direction from orbit time ──────────────────────────────────

function getSunDirectionAtTimestep(orbitalConfig: OrbitalConfig | null, currentTimeMin: number): THREE.Vector3 {
  if (!orbitalConfig) {
    // Fallback for demo mode with no orbital config
    return new THREE.Vector3(1, 0.3, 0).normalize();
  }
  const elapsedSeconds = currentTimeMin * 60;
  const dir = computeSunDirectionAtTime(orbitalConfig, elapsedSeconds);
  return new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
}

// ─── Orbit Scene Contents ───────────────────────────────────────────

interface OrbitSceneProps {
  shadowMapSize: number;
  onShadowDowngrade: (size: number) => void;
}

function OrbitScene({ shadowMapSize, onShadowDowngrade }: OrbitSceneProps) {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const orbitalConfig = useEditorStore((s) => s.orbitalConfig);

  const sunDirection = useMemo(
    () => getSunDirectionAtTimestep(orbitalConfig, currentTime),
    [orbitalConfig, currentTime],
  );
  const { intensity: sunIntensityRef, isEclipse: eclipse } = useEclipseIntensity(currentTime);

  // Orbit fraction (0-1) within current orbit
  const orbitFraction = useMemo(() => {
    return (currentTime % ORBIT_PERIOD_MIN) / ORBIT_PERIOD_MIN;
  }, [currentTime]);

  return (
    <>
      {/* Shadows + FPS monitor */}
      <ShadowInitializer />
      <FpsMonitor onShadowDowngrade={onShadowDowngrade} />

      {/* Lighting */}
      <ambientLight intensity={eclipse ? 0.04 : 0.12} />
      <OrbitSunLight
        sunDirection={sunDirection}
        intensity={sunIntensityRef.current}
        shadowMapSize={shadowMapSize}
      />

      {/* Earth */}
      <Suspense fallback={null}>
        <EarthSphere sunDirection={sunDirection} />
      </Suspense>

      {/* Orbit path + spacecraft */}
      <OrbitPath
        altitudeKm={400}
        inclinationDeg={51.6}
        orbitFraction={orbitFraction}
      />

      {/* Sun sphere with corona glow */}
      <SunSphere sunDirection={sunDirection} />

      {/* Eclipse status label */}
      <Html position={[0, EARTH_RADIUS_UNITS + 2, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap"
          style={{
            background: eclipse ? 'rgba(99,102,241,0.15)' : 'rgba(0,229,255,0.1)',
            color: eclipse ? '#818cf8' : '#00e5ff',
            border: `1px solid ${eclipse ? 'rgba(99,102,241,0.2)' : 'rgba(0,229,255,0.15)'}`,
          }}
        >
          {eclipse ? '● ECLIPSE' : '☀ SUNLIT'}
        </div>
      </Html>

      {/* Controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={8}
        maxDistance={80}
        dampingFactor={0.05}
        enableDamping
        target={[0, 0, 0]}
      />

      <GizmoHelper alignment="bottom-left" margin={[60, 60]}>
        <GizmoViewport
          axisColors={['#ff3355', '#33ff55', '#3355ff']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

// ─── Video Export Hook ──────────────────────────────────────────────

function useVideoExport(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const supportsRecording = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm');
  }, []);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supportsRecording) return;

    chunksRef.current = [];
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.download = `verixos-orbit-${date}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [canvasRef, supportsRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { isRecording, startRecording, stopRecording, supportsRecording };
}

// ─── Orbit Playback Component ───────────────────────────────────────

export function OrbitPlayback() {
  const [shadowMapSize, setShadowMapSize] = useState(SHADOW_MAP_SIZE_HIGH);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleShadowDowngrade = useCallback((size: number) => {
    setShadowMapSize(size);
  }, []);

  const { isRecording, startRecording, stopRecording, supportsRecording } = useVideoExport(canvasRef);

  return (
    <div className="h-full w-full relative bg-[#030810] overflow-hidden">
      <Canvas
        ref={canvasRef}
        camera={{ position: [15, 10, 15], fov: 45, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
        shadows
        style={{ background: '#030810' }}
      >
        <color attach="background" args={['#030810']} />
        <fog attach="fog" args={['#030810', 60, 120]} />
        <OrbitScene
          shadowMapSize={shadowMapSize}
          onShadowDowngrade={handleShadowDowngrade}
        />
      </Canvas>

      {/* Video export controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {!supportsRecording && (
          <div
            className="px-2 py-1 rounded text-[9px] font-mono"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            Video export not supported
          </div>
        )}
        {supportsRecording && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition-colors',
              isRecording
                ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                : 'text-slate-400 hover:text-cyan-400 bg-white/5 border border-white/10 hover:border-cyan-400/20',
            )}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3" />
                Stop & Download
              </>
            ) : (
              <>
                <Video className="w-3 h-3" />
                Export Video
              </>
            )}
          </button>
        )}
      </div>

      {/* Shadow quality indicator */}
      {shadowMapSize === SHADOW_MAP_SIZE_LOW && (
        <div
          className="absolute bottom-3 left-3 text-[9px] font-mono px-2 py-1 rounded"
          style={{
            background: 'rgba(234,179,8,0.1)',
            color: '#eab308',
            border: '1px solid rgba(234,179,8,0.15)',
          }}
        >
          Shadow quality reduced for performance
        </div>
      )}
    </div>
  );
}

// ─── Orbit View Toggle Button ───────────────────────────────────────

interface OrbitViewToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function OrbitViewToggle({ isActive, onToggle }: OrbitViewToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition-colors',
        isActive
          ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20'
          : 'text-slate-400 hover:text-cyan-400 bg-white/5 border border-white/10 hover:border-cyan-400/20',
      )}
      title="Toggle Orbit View"
    >
      <Globe className="w-3.5 h-3.5" />
      Orbit View
    </button>
  );
}
