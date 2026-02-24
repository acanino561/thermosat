'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';

const NODE_RADIUS = 24;

const nodeTypeColors: Record<string, string> = {
  diffusion: '#3b82f6',
  arithmetic: '#06b6d4',
  boundary: '#f97316',
};

const nodeTypeShapes: Record<string, 'circle' | 'diamond' | 'square'> = {
  diffusion: 'circle',
  arithmetic: 'diamond',
  boundary: 'square',
};

export function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    nodes,
    conductors,
    heatLoads,
    selectedNodeId,
    selectedConductorId,
    selectNode,
    selectConductor,
    clearSelection,
    updateNode,
    showResultsOverlay,
    simulationResults,
  } = useEditorStore();

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const toScreen = useCallback(
    (x: number, y: number) => ({
      x: (x + offset.x) * scale,
      y: (y + offset.y) * scale,
    }),
    [offset, scale],
  );

  const toWorld = useCallback(
    (x: number, y: number) => ({
      x: x / scale - offset.x,
      y: y / scale - offset.y,
    }),
    [offset, scale],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40 * scale;
    const startX = (offset.x * scale) % gridSize;
    const startY = (offset.y * scale) % gridSize;
    for (let x = startX; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = startY; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Build node position lookup
    const nodePos = new Map<string, { x: number; y: number }>();
    nodes.forEach((node) => {
      const pos = toScreen(node.x ?? 0, node.y ?? 0);
      nodePos.set(node.id, pos);
    });

    // Draw conductors
    conductors.forEach((cond) => {
      const from = nodePos.get(cond.nodeFromId);
      const to = nodePos.get(cond.nodeToId);
      if (!from || !to) return;

      const isSelected = selectedConductorId === cond.id;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = isSelected
        ? '#22c55e'
        : cond.conductorType === 'radiation'
          ? 'rgba(249, 115, 22, 0.4)'
          : 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = isSelected ? 3 : 2;
      if (cond.conductorType === 'radiation') {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cond.name, midX, midY - 8);
    });

    // Draw nodes
    nodes.forEach((node) => {
      const pos = nodePos.get(node.id);
      if (!pos) return;

      const color = nodeTypeColors[node.nodeType] || '#666';
      const isSelected = selectedNodeId === node.id;
      const r = NODE_RADIUS * scale;

      // Glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${color}33`;
        ctx.fill();
      }

      // Heat load indicator
      const hasHeatLoad = heatLoads.some((hl) => hl.nodeId === node.id);
      if (hasHeatLoad) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#f9731644';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node shape
      ctx.beginPath();
      const shape = nodeTypeShapes[node.nodeType];
      if (shape === 'diamond') {
        ctx.moveTo(pos.x, pos.y - r);
        ctx.lineTo(pos.x + r, pos.y);
        ctx.lineTo(pos.x, pos.y + r);
        ctx.lineTo(pos.x - r, pos.y);
        ctx.closePath();
      } else if (shape === 'square') {
        ctx.rect(pos.x - r * 0.8, pos.y - r * 0.8, r * 1.6, r * 1.6);
      } else {
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = isSelected ? `${color}40` : `${color}20`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? color : `${color}80`;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Node name
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${11 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, pos.x, pos.y);

      // Temperature label
      if (showResultsOverlay && simulationResults) {
        const nodeResult = simulationResults.nodeResults[node.id];
        if (nodeResult) {
          const lastTemp = nodeResult.temperatures[nodeResult.temperatures.length - 1];
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${10 * scale}px monospace`;
          ctx.fillText(`${lastTemp.toFixed(1)}K`, pos.x, pos.y + r + 14);
        }
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = `${9 * scale}px monospace`;
        ctx.fillText(`${node.temperature.toFixed(0)}K`, pos.x, pos.y + r + 12);
      }
    });
  }, [nodes, conductors, heatLoads, selectedNodeId, selectedConductorId, offset, scale, toScreen, showResultsOverlay, simulationResults]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const findNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      for (const node of nodes) {
        const pos = toScreen(node.x ?? 0, node.y ?? 0);
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS * scale + 8) {
          return node.id;
        }
      }
      return null;
    },
    [nodes, toScreen, scale],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    const nodeId = findNodeAt(e.clientX, e.clientY);
    if (nodeId) {
      setDragNode(nodeId);
      selectNode(nodeId);
    } else if (e.button === 0) {
      setIsPanning(true);
      clearSelection();
    }
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    if (dragNode) {
      updateNode(dragNode, {
        x: (nodes.find((n) => n.id === dragNode)?.x ?? 0) + dx / scale,
        y: (nodes.find((n) => n.id === dragNode)?.y ?? 0) + dy / scale,
      });
    } else if (isPanning) {
      setOffset((prev) => ({
        x: prev.x + dx / scale,
        y: prev.y + dy / scale,
      }));
    }
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragNode(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.3, Math.min(3, prev * delta)));
  };

  return (
    <div ref={containerRef} className="h-full w-full relative bg-space-base overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">No nodes yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Add nodes using the toolbar above
            </p>
          </div>
        </div>
      )}
      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50 font-mono glass rounded px-2 py-1">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
