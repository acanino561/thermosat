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
import { DesignSpaceSetup } from '@/components/results/design-space-setup';
import { DesignSpaceChart } from '@/components/results/design-space-chart';
import { DesignSpaceResultsTable } from '@/components/results/design-space-results-table';
import type { ExplorationSampleResult, ExplorationParameter } from '@/lib/solver/design-space';

interface PropertiesPanelProps {
  readOnly?: boolean;
}

export function PropertiesPanel({ readOnly }: PropertiesPanelProps = {}) {
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureAnalysisId, setFailureAnalysisId] = useState<string | null>(null);
  const [explorationId, setExplorationId] = useState<string | null>(null);
  const [explorationResults, setExplorationResults] = useState<ExplorationSampleResult[] | null>(null);
  const [explorationParams, setExplorationParams] = useState<ExplorationParameter[]>([]);
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
          {readOnly && (
            <div className="mb-3 font-mono text-[10px]" style={{ color: 'var(--tc-text-muted, #64748b)' }}>
              Read-only demo —{' '}
              <a href="/signup" className="text-cyan-400 hover:underline">
                sign up to edit
              </a>
            </div>
          )}
          <fieldset disabled={readOnly} className={readOnly ? 'opacity-80' : ''}>
          {selectedNode ? (
            <NodeProperties node={selectedNode} />
          ) : selectedConductor ? (
            <ConductorProperties conductor={selectedConductor} />
          ) : hasSurfaceSelection ? (
            <SurfaceProperties />
          ) : (
            <ModelOverview />
          )}
          </fieldset>

          {/* What If panel — visible when results overlay is active (not in readOnly/demo mode) */}
          {!readOnly && showResultsOverlay && simulationResults && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <WhatIfPanel
                projectId={projectId}
                modelId={modelId}
                runId={simulationResults.runId}
              />
            </div>
          )}

          {/* Failure Mode Analysis panel — not in readOnly/demo mode */}
          {!readOnly && showResultsOverlay && simulationResults && projectId && modelId && (
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

          {/* Design Space Explorer */}
          {!readOnly && showResultsOverlay && simulationResults && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <DesignSpaceSetup
                projectId={projectId}
                modelId={modelId}
                onExplorationComplete={async (explorationId) => {
                  const res = await fetch(`/api/projects/${projectId}/models/${modelId}/design-explorations/${explorationId}/results`);
                  const data = await res.json();
                  setExplorationResults(data.data.results);
                  setExplorationParams(data.data.exploration.config.parameters);
                }}
              />
            </div>
          )}
          {explorationResults && explorationParams.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              <DesignSpaceChart results={explorationResults} parameters={explorationParams} />
              <DesignSpaceResultsTable results={explorationResults} parameters={explorationParams} />
            </div>
          )}

          {/* Design Space Explorer */}
          {!readOnly && showResultsOverlay && simulationResults && projectId && modelId && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <DesignSpaceSetup
                projectId={projectId}
                modelId={modelId}
                onExplorationComplete={async (id) => {
                  setExplorationId(id);
                  try {
                    const res = await fetch(
                      `/api/projects/${projectId}/models/${modelId}/design-explorations/${id}/results`,
                    );
                    if (res.ok) {
                      const data = await res.json();
                      setExplorationResults(data.results ?? data.data?.results ?? []);
                      setExplorationParams(data.config?.parameters ?? data.data?.config?.parameters ?? []);
                    }
                  } catch {
                    // Results will be fetched on retry
                  }
                }}
              />
            </div>
          )}

          {/* Design Space Results */}
          {explorationResults && explorationResults.length > 0 && (
            <>
              <div className="mt-4 pt-4 border-t border-white/10">
                <DesignSpaceChart results={explorationResults} parameters={explorationParams} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <DesignSpaceResultsTable results={explorationResults} parameters={explorationParams} />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
