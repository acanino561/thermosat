'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { useUnitsStore } from '@/lib/stores/units-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NodeProperties } from './node-properties';
import { ConductorProperties } from './conductor-properties';
import { ModelOverview } from './model-overview';
import { SurfaceProperties } from './surface-properties';
import { useState } from 'react';
import { WhatIfPanel } from '@/components/results/what-if-panel';
import { FailureModePanel } from '@/components/results/failure-mode-panel';
import { RiskMatrix } from '@/components/results/risk-matrix';

export function PropertiesPanel() {
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureAnalysisId, setFailureAnalysisId] = useState<string | null>(null);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedConductorId = useEditorStore((s) => s.selectedConductorId);
  const selectedCadFaceIds = useEditorStore((s) => s.selectedCadFaceIds);
  const selectedCadFaceId = useEditorStore((s) => s.selectedCadFaceId);
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);
  const showResultsOverlay = useEditorStore((s) => s.showResultsOverlay);
  const simulationResults = useEditorStore((s) => s.simulationResults);
  const projectId = useEditorStore((s) => s.projectId);
  const modelId = useEditorStore((s) => s.modelId);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedConductor = selectedConductorId
    ? conductors.find((c) => c.id === selectedConductorId)
    : null;
  const hasSurfaceSelection = selectedCadFaceIds.length > 0 || selectedCadFaceId !== null;

  const panelTitle = selectedNode
    ? 'Node Properties'
    : selectedConductor
      ? 'Conductor Properties'
      : hasSurfaceSelection
        ? 'Surface Properties'
        : 'Model Overview';

  return (
    <div className="h-full flex flex-col border-l border-white/10 bg-space-surface/50">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-heading font-semibold">{panelTitle}</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {selectedNode ? (
            <NodeProperties node={selectedNode} />
          ) : selectedConductor ? (
            <ConductorProperties conductor={selectedConductor} />
          ) : hasSurfaceSelection ? (
            <SurfaceProperties />
          ) : (
            <ModelOverview />
          )}

          {/* What If panel — visible when results overlay is active */}
          {showResultsOverlay && simulationResults && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <WhatIfPanel
                projectId={projectId}
                modelId={modelId}
                runId={simulationResults.runId}
              />
            </div>
          )}

          {/* Failure Mode Analysis panel */}
          {showResultsOverlay && simulationResults && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <FailureModePanel
                open={failureModalOpen}
                onOpenChange={setFailureModalOpen}
                projectId={projectId}
                modelId={modelId}
                onAnalysisComplete={(id) => { setFailureAnalysisId(id); setFailureModalOpen(false); }}
              />
            </div>
          )}

          {/* Risk Matrix results */}
          {failureAnalysisId && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <RiskMatrix analysisId={failureAnalysisId} projectId={projectId} modelId={modelId} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
