'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEditorStore, type Conductor } from '@/lib/stores/editor-store';

interface ConductorPropertiesProps {
  conductor: Conductor;
}

export function ConductorProperties({ conductor }: ConductorPropertiesProps) {
  const updateConductor = useEditorStore((s) => s.updateConductor);
  const nodes = useEditorStore((s) => s.nodes);

  const fromNode = nodes.find((n) => n.id === conductor.nodeFromId);
  const toNode = nodes.find((n) => n.id === conductor.nodeToId);

  const handleChange = (field: keyof Conductor, value: string | number | null) => {
    updateConductor(conductor.id, { [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="cyan">{conductor.conductorType}</Badge>
        <span className="text-xs font-mono text-muted-foreground">
          {conductor.id.slice(0, 8)}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cond-name">Name</Label>
        <Input
          id="cond-name"
          value={conductor.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="bg-white/5 h-8 text-sm"
        />
      </div>

      <div className="p-3 rounded-lg bg-white/5 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Connection</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-accent-blue">{fromNode?.name ?? 'Unknown'}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-accent-cyan">{toNode?.name ?? 'Unknown'}</span>
        </div>
      </div>

      {conductor.conductorType !== 'radiation' && (
        <div className="space-y-2">
          <Label htmlFor="cond-g">Conductance (W/K)</Label>
          <Input
            id="cond-g"
            type="number"
            value={conductor.conductance ?? ''}
            onChange={(e) => handleChange('conductance', parseFloat(e.target.value) || null)}
            className="bg-white/5 h-8 text-sm"
            min="0"
            step="0.001"
          />
        </div>
      )}

      {conductor.conductorType === 'radiation' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cond-area">Area (m²)</Label>
            <Input
              id="cond-area"
              type="number"
              value={conductor.area ?? ''}
              onChange={(e) => handleChange('area', parseFloat(e.target.value) || null)}
              className="bg-white/5 h-8 text-sm"
              min="0"
              step="0.0001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="cond-vf">View Factor</Label>
              <Input
                id="cond-vf"
                type="number"
                value={conductor.viewFactor ?? ''}
                onChange={(e) => handleChange('viewFactor', parseFloat(e.target.value) || null)}
                className="bg-white/5 h-7 text-xs"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="cond-em">Emissivity</Label>
              <Input
                id="cond-em"
                type="number"
                value={conductor.emissivity ?? ''}
                onChange={(e) => handleChange('emissivity', parseFloat(e.target.value) || null)}
                className="bg-white/5 h-7 text-xs"
                min="0"
                max="1"
                step="0.01"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
