'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SurfaceContextMenuProps {
  x: number;
  y: number;
  faceIds: string[];
  onClose: () => void;
}

export function SurfaceContextMenu({ x, y, faceIds, onClose }: SurfaceContextMenuProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const assignSurfacesToNode = useEditorStore((s) => s.assignSurfacesToNode);
  const removeSurfaceAssignments = useEditorStore((s) => s.removeSurfaceAssignments);
  const addNode = useEditorStore((s) => s.addNode);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleAssign = useCallback((nodeId: string) => {
    assignSurfacesToNode(faceIds, nodeId);
    onClose();
  }, [faceIds, assignSurfacesToNode, onClose]);

  const handleUnassign = useCallback(() => {
    removeSurfaceAssignments(faceIds);
    onClose();
  }, [faceIds, removeSurfaceAssignments, onClose]);

  const handleCreateAndAssign = useCallback(() => {
    const name = newNodeName.trim() || `Node ${nodes.length + 1}`;
    // addNode creates the node and returns void; we need the new node id
    // The store pushes it to the end of nodes array, so we grab it after
    addNode({
      name,
      nodeType: 'diffusion',
      temperature: 293,
      capacitance: 100,
    });
    // Get the freshly created node (last in array)
    const updatedNodes = useEditorStore.getState().nodes;
    const newNode = updatedNodes[updatedNodes.length - 1];
    if (newNode) {
      assignSurfacesToNode(faceIds, newNode.id);
    }
    setShowCreateDialog(false);
    setNewNodeName('');
    onClose();
  }, [newNodeName, nodes.length, addNode, assignSurfacesToNode, faceIds, onClose]);

  if (showCreateDialog) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); onClose(); } }}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Create New Node</DialogTitle>
            <DialogDescription>
              Create a node and assign {faceIds.length} surface{faceIds.length > 1 ? 's' : ''} to it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="node-name" className="text-xs">Node Name</Label>
            <Input
              id="node-name"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder={`Node ${nodes.length + 1}`}
              className="mt-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAssign(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreateDialog(false); onClose(); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateAndAssign}>
              Create & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const surfaceLabel = faceIds.length > 1 ? `${faceIds.length} surfaces` : '1 surface';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border border-white/10 bg-space-surface/95 backdrop-blur-md shadow-xl py-1"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
        {surfaceLabel}
      </div>

      {/* Assign to existing nodes */}
      {nodes.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] text-muted-foreground/40">Assign to node</div>
          {nodes.map((node) => (
            <button
              key={node.id}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-white/5 transition-colors"
              onClick={() => handleAssign(node.id)}
            >
              <span className="truncate">{node.name}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-white/10" />
        </>
      )}

      {/* Create New Node */}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left text-accent-cyan hover:bg-white/5 transition-colors"
        onClick={() => setShowCreateDialog(true)}
      >
        + Create New Node
      </button>

      {/* Unassign */}
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left text-muted-foreground hover:bg-white/5 transition-colors"
        onClick={handleUnassign}
      >
        Unassign
      </button>
    </div>
  );
}
