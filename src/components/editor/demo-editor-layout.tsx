'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { Toolbar } from './toolbar';
import { TreePanel } from './tree-panel';
import { NetworkGraph } from './network-graph';
import { PropertiesPanel } from './properties-panel';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Box, Network, Rocket } from 'lucide-react';

// Dynamic import — R3F/Three.js should never SSR
const Viewport3D = dynamic(
  () => import('./viewport-3d').then((m) => m.Viewport3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#030810]">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-mono text-muted-foreground/50">Loading 3D viewport…</div>
        </div>
      </div>
    ),
  },
);

/**
 * Demo variant of EditorLayout — no auth, no API calls, no projectId/modelId props.
 * Reads everything from the Zustand store which is pre-seeded by the demo page.
 */
export function DemoEditorLayout() {
  const modelName = useEditorStore((s) => s.modelName);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);

  return (
    <div className="h-screen flex flex-col bg-space-base overflow-hidden">
      {/* Demo banner */}
      <div
        className="flex items-center gap-2 px-4 shrink-0"
        style={{
          height: '36px',
          background: 'linear-gradient(90deg, rgba(0,229,255,0.08), rgba(139,92,246,0.08))',
          borderBottom: '1px solid rgba(0,229,255,0.15)',
        }}
      >
        <Rocket className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-mono text-cyan-300/80 tracking-wide">
          DEMO MODE
        </span>
        <span className="text-[11px] font-mono text-slate-500 mx-2">—</span>
        <span className="text-[11px] font-mono text-slate-400">
          {modelName || '6U CubeSat Thermal Model'}
        </span>
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-slate-600">
          Sample data · No auth required
        </span>
      </div>

      {/* Toolbar — pass demo projectId to avoid errors */}
      <Toolbar projectId="demo" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Model Tree */}
        <div className="w-56 lg:w-64 shrink-0">
          <TreePanel />
        </div>

        {/* Center — Viewport with tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div
            className="flex items-center gap-0 px-2 shrink-0"
            style={{
              height: '32px',
              background: 'rgba(5,5,5,0.8)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <ViewTab
              active={activeView === '3d'}
              onClick={() => setActiveView('3d')}
              icon={<Box className="w-3 h-3" />}
              label="3D Viewport"
            />
            <ViewTab
              active={activeView === 'network'}
              onClick={() => setActiveView('network')}
              icon={<Network className="w-3 h-3" />}
              label="Network Graph"
            />
          </div>

          {/* Active view */}
          <div className="flex-1 min-h-0">
            {activeView === '3d' ? <Viewport3D /> : <NetworkGraph />}
          </div>
        </div>

        {/* Right panel — Properties */}
        <div className="w-64 lg:w-80 shrink-0">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}

// ─── ViewTab ────────────────────────────────────────────────────────────

interface ViewTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewTab({ active, onClick, icon, label }: ViewTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 h-full text-[11px] font-mono tracking-wide transition-colors relative',
        active
          ? 'text-[#e2e8f0]'
          : 'text-[#64748b] hover:text-[#94a3b8]',
      )}
    >
      {icon}
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-2 right-2 h-[1px]"
          style={{ background: 'var(--tc-accent, #00e5ff)' }}
        />
      )}
    </button>
  );
}
