'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useEditorStore, type RenderMode } from '@/lib/stores/editor-store';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface ViewportContextMenuProps {
  children: ReactNode;
  onScreenshot: () => void;
}

export function ViewportContextMenu({ children, onScreenshot }: ViewportContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedCadFaceId = useEditorStore((s) => s.selectedCadFaceId);
  const nodes = useEditorStore((s) => s.nodes);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const setRenderMode = useEditorStore((s) => s.setRenderMode);
  const renderMode = useEditorStore((s) => s.viewportState.renderMode);
  const setCameraPreset = useEditorStore((s) => s.setCameraPreset);
  const removeSurfaceAssignments = useEditorStore((s) => s.removeSurfaceAssignments);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [isOpen]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const items: ContextMenuItem[] = [];

  if (selectedNode) {
    items.push({
      label: `Node: ${selectedNode.name}`,
      onClick: () => {},
      disabled: true,
    });
    items.push({
      label: 'Focus Camera',
      onClick: () => useEditorStore.getState().focusOnNode(selectedNode.id),
    });
    items.push({
      label: 'Delete Node',
      onClick: () => deleteNode(selectedNode.id),
      separator: true,
    });
  }

  if (selectedCadFaceId) {
    items.push({
      label: 'Unassign Surface',
      onClick: () => removeSurfaceAssignments([selectedCadFaceId]),
    });
    items.push({
      label: 'Deselect',
      onClick: () => clearSelection(),
      separator: true,
    });
  }

  // Always available
  items.push({
    label: 'Fit All',
    onClick: () => setCameraPreset('fit-all'),
  });
  items.push({
    label: 'Isometric View',
    onClick: () => setCameraPreset('isometric'),
    separator: true,
  });

  const renderModes: RenderMode[] = ['solid', 'wireframe', 'thermal', 'material'];
  renderModes.forEach((mode) => {
    items.push({
      label: `${renderMode === mode ? '● ' : ''}${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      onClick: () => setRenderMode(mode),
    });
  });

  items.push({ label: '', onClick: () => {}, separator: true });
  items.push({
    label: 'Screenshot',
    onClick: onScreenshot,
  });

  return (
    <div onContextMenu={handleContextMenu} className="h-full w-full">
      {children}
      {isOpen && (
        <div
          className="fixed z-50"
          style={{ left: position.x, top: position.y }}
        >
          <div
            className="min-w-[160px] rounded-md py-1 shadow-xl"
            style={{
              background: 'rgba(10,15,25,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {items.map((item, i) => {
              if (item.separator && i > 0) {
                return (
                  <div key={`sep-${i}`}>
                    <div className="h-px bg-white/10 my-1" />
                    {item.label && (
                      <button
                        className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default"
                        onClick={(e) => { e.stopPropagation(); item.onClick(); setIsOpen(false); }}
                        disabled={item.disabled}
                      >
                        {item.label}
                      </button>
                    )}
                  </div>
                );
              }
              if (!item.label) return null;
              return (
                <button
                  key={i}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-default"
                  onClick={(e) => { e.stopPropagation(); item.onClick(); setIsOpen(false); }}
                  disabled={item.disabled}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
