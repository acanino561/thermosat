'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { Toolbar } from './toolbar';
import { TreePanel } from './tree-panel';
import { NetworkGraph } from './network-graph';
import { PropertiesPanel } from './properties-panel';

interface EditorLayoutProps {
  projectId: string;
  modelId: string;
}

export function EditorLayout({ projectId, modelId }: EditorLayoutProps) {
  const loadModel = useEditorStore((s) => s.loadModel);

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
        {/* Center — Network Graph */}
        <div className="flex-1">
          <NetworkGraph />
        </div>
        {/* Right panel — Properties */}
        <div className="w-64 lg:w-80 shrink-0">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
