'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CubeSatModel } from '@/components/three/cubesat-model';
import { TimelineAnimator } from './timeline-scrubber';
import { useEditorStore } from '@/lib/stores/editor-store';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { isInEclipse } from '@/lib/demo/simulation-data';

/**
 * Demo variant of the 3D viewport that renders the procedural CubeSat model
 * with thermal overlays driven by the timeline store.
 */
export function DemoViewport3D() {
  const nodes = useEditorStore((s) => s.nodes);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const eclipse = isInEclipse(currentTime);

  return (
    <div className="h-full w-full relative bg-[#030810] overflow-hidden">
      <Canvas
        camera={{ position: [5, 4, 6], fov: 45, near: 0.1, far: 200 }}
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
        <fog attach="fog" args={['#030810', 40, 80]} />
        <Suspense fallback={null}>
          <CubeSatModel />
          <TimelineAnimator />
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={3}
            maxDistance={50}
            dampingFactor={0.05}
            enableDamping
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>

      {/* Status overlay — top left */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div
          className="px-2.5 py-1.5 rounded text-[10px] font-mono"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-slate-500">6U CubeSat</span>
          <span className="text-slate-700 mx-1.5">│</span>
          <span className={eclipse ? 'text-indigo-400' : 'text-cyan-400'}>
            {eclipse ? '● Eclipse' : '☀ Sunlit'}
          </span>
        </div>
      </div>

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
          {nodes.length} nodes · CubeSat 3D
        </div>
      )}
    </div>
  );
}
