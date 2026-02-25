'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { Toolbar } from './toolbar';
import { TreePanel } from './tree-panel';
import { NetworkGraph } from './network-graph';
import { PropertiesPanel } from './properties-panel';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Box, Network } from 'lucide-react';

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

interface EditorLayoutProps {
  projectId: string;
  modelId: string;
}

export function EditorLayout({ projectId, modelId }: EditorLayoutProps) {
  const loadModel = useEditorStore((s) => s.loadModel);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);

  useEffect(() => {
    loadModel(projectId, modelId);
  }, [projectId, modelId, loadModel]);

  return (
    <div className="h-screen flex flex-col bg-space-base overflow-hidden">
      <Toolbar projectId={projectId} />
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
