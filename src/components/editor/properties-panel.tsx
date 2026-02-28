'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { useUnitsStore } from '@/lib/stores/units-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NodeProperties } from './node-properties';
import { ConductorProperties } from './conductor-properties';
import { ModelOverview } from './model-overview';
import { SurfaceProperties } from './surface-properties';

export function PropertiesPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedConductorId = useEditorStore((s) => s.selectedConductorId);
  const selectedCadFaceIds = useEditorStore((s) => s.selectedCadFaceIds);
  const selectedCadFaceId = useEditorStore((s) => s.selectedCadFaceId);
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);

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
        </div>
      </ScrollArea>
    </div>
  );
}
