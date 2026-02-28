'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { useUnitsStore } from '@/lib/stores/units-store';
import { useMemo } from 'react';

export function SurfaceProperties() {
  const selectedCadFaceIds = useEditorStore((s) => s.selectedCadFaceIds);
  const selectedCadFaceId = useEditorStore((s) => s.selectedCadFaceId);
  const getSurfaceProperties = useEditorStore((s) => s.getSurfaceProperties);
  const surfaceNodeMappings = useEditorStore((s) => s.surfaceNodeMappings);
  const nodes = useEditorStore((s) => s.nodes);
  const cadGeometry = useEditorStore((s) => s.cadGeometry);
  const unitSystem = useUnitsStore((s) => s.unitSystem);

  const faceIds = selectedCadFaceIds.length > 0 ? selectedCadFaceIds : selectedCadFaceId ? [selectedCadFaceId] : [];
  const primaryFaceId = faceIds[0] ?? null;

  const props = useMemo(() => {
    if (!primaryFaceId) return null;
    return getSurfaceProperties(primaryFaceId);
  }, [primaryFaceId, getSurfaceProperties]);

  const faceName = useMemo(() => {
    if (!primaryFaceId || !cadGeometry) return null;
    return cadGeometry.faces.find((f) => f.id === primaryFaceId)?.name ?? primaryFaceId.slice(0, 8);
  }, [primaryFaceId, cadGeometry]);

  const assignedNode = useMemo(() => {
    if (!primaryFaceId) return null;
    const mapping = surfaceNodeMappings.find((m) => m.faceId === primaryFaceId);
    if (!mapping) return null;
    return nodes.find((n) => n.id === mapping.nodeId) ?? null;
  }, [primaryFaceId, surfaceNodeMappings, nodes]);

  if (!props) {
    return (
      <p className="text-xs text-muted-foreground">No surface data available.</p>
    );
  }

  const areaLabel = unitSystem === 'Imperial' ? 'ft²' : 'm²';
  const areaValue = unitSystem === 'Imperial' ? props.area * 10.7639 : props.area;

  return (
    <div className="space-y-4">
      {/* Face name & count */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          {faceIds.length > 1 ? `${faceIds.length} surfaces selected` : 'Surface'}
        </p>
        <p className="text-sm font-mono">{faceName}</p>
      </div>

      {/* Assigned node */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Assigned Node</p>
        <p className="text-sm font-mono">
          {assignedNode ? assignedNode.name : <span className="text-muted-foreground/50">Unassigned</span>}
        </p>
      </div>

      {/* Surface Area */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Surface Area</p>
        <p className="text-sm font-mono tabular-nums">
          {areaValue.toFixed(6)} {areaLabel}
        </p>
      </div>

      {/* Normal Vector */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Normal Vector</p>
        <div className="grid grid-cols-3 gap-2 text-sm font-mono tabular-nums">
          <div>
            <span className="text-red-400 text-[10px]">X </span>
            {props.normal[0].toFixed(4)}
          </div>
          <div>
            <span className="text-green-400 text-[10px]">Y </span>
            {props.normal[1].toFixed(4)}
          </div>
          <div>
            <span className="text-blue-400 text-[10px]">Z </span>
            {props.normal[2].toFixed(4)}
          </div>
        </div>
      </div>

      {/* Centroid */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Centroid</p>
        <div className="grid grid-cols-3 gap-2 text-sm font-mono tabular-nums">
          <div>
            <span className="text-red-400 text-[10px]">X </span>
            {props.centroid[0].toFixed(4)}
          </div>
          <div>
            <span className="text-green-400 text-[10px]">Y </span>
            {props.centroid[1].toFixed(4)}
          </div>
          <div>
            <span className="text-blue-400 text-[10px]">Z </span>
            {props.centroid[2].toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
}
