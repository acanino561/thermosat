'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NodeProperties } from './node-properties';
import { ConductorProperties } from './conductor-properties';
import { ModelOverview } from './model-overview';

export function PropertiesPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedConductorId = useEditorStore((s) => s.selectedConductorId);
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedConductor = selectedConductorId
    ? conductors.find((c) => c.id === selectedConductorId)
    : null;

  return (
    <div className="h-full flex flex-col border-l border-white/10 bg-space-surface/50">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-heading font-semibold">
          {selectedNode
            ? 'Node Properties'
            : selectedConductor
              ? 'Conductor Properties'
              : 'Model Overview'}
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {selectedNode ? (
            <NodeProperties node={selectedNode} />
          ) : selectedConductor ? (
            <ConductorProperties conductor={selectedConductor} />
          ) : (
            <ModelOverview />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
