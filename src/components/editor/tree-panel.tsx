'use client';

import { motion } from 'framer-motion';
import { useEditorStore } from '@/lib/stores/editor-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ChevronRight, Circle, Diamond, Square, GitBranch, Flame, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const nodeTypeIcons = {
  diffusion: Circle,
  arithmetic: Diamond,
  boundary: Square,
};

const nodeTypeColors = {
  diffusion: 'text-accent-blue',
  arithmetic: 'text-accent-cyan',
  boundary: 'text-accent-orange',
};

interface TreePanelProps {
  readOnly?: boolean;
}

export function TreePanel({ readOnly }: TreePanelProps = {}) {
  const {
    nodes,
    conductors,
    heatLoads,
    selectedNodeId,
    selectedConductorId,
    selectedHeatLoadId,
    selectNode,
    selectConductor,
    selectHeatLoad,
    deleteNode,
    deleteConductor,
    deleteHeatLoad,
  } = useEditorStore();

  const [nodesOpen, setNodesOpen] = useState(true);
  const [conductorsOpen, setConductorsOpen] = useState(true);
  const [heatLoadsOpen, setHeatLoadsOpen] = useState(true);

  return (
    <div className="h-full flex flex-col border-r border-white/10 bg-space-surface/50">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-heading font-semibold">Model Tree</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Nodes */}
          <Collapsible open={nodesOpen} onOpenChange={setNodesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer">
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', nodesOpen && 'rotate-90')} />
              <span className="text-sm font-medium">Nodes</span>
              <span className="text-xs text-muted-foreground ml-auto">{nodes.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-0.5">
                {nodes.map((node) => {
                  const Icon = nodeTypeIcons[node.nodeType];
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <ContextMenu key={node.id}>
                      <ContextMenuTrigger>
                        <button
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-all duration-150 cursor-pointer',
                            isSelected
                              ? 'bg-accent-blue/15 text-accent-blue'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                          )}
                          onClick={() => selectNode(node.id)}
                        >
                          <Icon className={cn('h-3.5 w-3.5', nodeTypeColors[node.nodeType])} />
                          <span className="truncate">{node.name}</span>
                          <span className="ml-auto text-[10px] font-mono opacity-60">
                            {node.temperature.toFixed(0)}K
                          </span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => selectNode(node.id)}>
                          Select
                        </ContextMenuItem>
                        <ContextMenuItem disabled={readOnly}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className={readOnly ? 'text-muted-foreground' : 'text-red-400'}
                          disabled={readOnly}
                          onClick={readOnly ? undefined : () => deleteNode(node.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {nodes.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-2">No nodes yet</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Conductors */}
          <Collapsible open={conductorsOpen} onOpenChange={setConductorsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5 transition-colors mt-1 cursor-pointer">
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', conductorsOpen && 'rotate-90')} />
              <span className="text-sm font-medium">Conductors</span>
              <span className="text-xs text-muted-foreground ml-auto">{conductors.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-0.5">
                {conductors.map((cond) => {
                  const isSelected = selectedConductorId === cond.id;
                  return (
                    <ContextMenu key={cond.id}>
                      <ContextMenuTrigger>
                        <button
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-all duration-150 cursor-pointer',
                            isSelected
                              ? 'bg-accent-cyan/15 text-accent-cyan'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                          )}
                          onClick={() => selectConductor(cond.id)}
                        >
                          <GitBranch className="h-3.5 w-3.5 text-green-400" />
                          <span className="truncate">{cond.name}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => selectConductor(cond.id)}>
                          Select
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className={readOnly ? 'text-muted-foreground' : 'text-red-400'}
                          disabled={readOnly}
                          onClick={readOnly ? undefined : () => deleteConductor(cond.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {conductors.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-2">No conductors yet</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Heat Loads */}
          <Collapsible open={heatLoadsOpen} onOpenChange={setHeatLoadsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5 transition-colors mt-1 cursor-pointer">
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', heatLoadsOpen && 'rotate-90')} />
              <span className="text-sm font-medium">Heat Loads</span>
              <span className="text-xs text-muted-foreground ml-auto">{heatLoads.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-0.5">
                {heatLoads.map((hl) => {
                  const isSelected = selectedHeatLoadId === hl.id;
                  return (
                    <ContextMenu key={hl.id}>
                      <ContextMenuTrigger>
                        <button
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-all duration-150 cursor-pointer',
                            isSelected
                              ? 'bg-accent-orange/15 text-accent-orange'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                          )}
                          onClick={() => selectHeatLoad(hl.id)}
                        >
                          <Flame className="h-3.5 w-3.5 text-accent-orange" />
                          <span className="truncate">{hl.name}</span>
                          {hl.value != null && (
                            <span className="ml-auto text-[10px] font-mono opacity-60">
                              {hl.value}W
                            </span>
                          )}
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => selectHeatLoad(hl.id)}>
                          Select
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className={readOnly ? 'text-muted-foreground' : 'text-red-400'}
                          disabled={readOnly}
                          onClick={readOnly ? undefined : () => deleteHeatLoad(hl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {heatLoads.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-2">No heat loads yet</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
