'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditorStore, type ThermalNode } from '@/lib/stores/editor-store';

interface NodePropertiesProps {
  node: ThermalNode;
}

export function NodeProperties({ node }: NodePropertiesProps) {
  const updateNode = useEditorStore((s) => s.updateNode);

  const handleChange = (field: keyof ThermalNode, value: string | number | null) => {
    updateNode(node.id, { [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge
          variant={
            node.nodeType === 'diffusion'
              ? 'blue'
              : node.nodeType === 'arithmetic'
                ? 'cyan'
                : 'orange'
          }
        >
          {node.nodeType}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground">
          {node.id.slice(0, 8)}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prop-name">Name</Label>
        <Input
          id="prop-name"
          value={node.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="bg-white/5 h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Node Type</Label>
        <Select
          value={node.nodeType}
          onValueChange={(v) => handleChange('nodeType', v)}
        >
          <SelectTrigger className="bg-white/5 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diffusion">Diffusion</SelectItem>
            <SelectItem value="arithmetic">Arithmetic</SelectItem>
            <SelectItem value="boundary">Boundary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prop-temp">Temperature (K)</Label>
        <Input
          id="prop-temp"
          type="number"
          value={node.temperature}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
          className="bg-white/5 h-8 text-sm"
          min="0"
          max="10000"
          step="0.1"
        />
      </div>

      {node.nodeType === 'diffusion' && (
        <div className="space-y-2">
          <Label htmlFor="prop-cap">Capacitance (J/K)</Label>
          <Input
            id="prop-cap"
            type="number"
            value={node.capacitance ?? ''}
            onChange={(e) => handleChange('capacitance', parseFloat(e.target.value) || null)}
            className="bg-white/5 h-8 text-sm"
            min="0"
            step="0.1"
          />
        </div>
      )}

      {node.nodeType === 'boundary' && (
        <div className="space-y-2">
          <Label htmlFor="prop-btemp">Boundary Temp (K)</Label>
          <Input
            id="prop-btemp"
            type="number"
            value={node.boundaryTemp ?? ''}
            onChange={(e) => handleChange('boundaryTemp', parseFloat(e.target.value) || null)}
            className="bg-white/5 h-8 text-sm"
            min="0"
            max="10000"
            step="0.1"
          />
        </div>
      )}

      <div className="pt-2 border-t border-white/10">
        <p className="text-xs font-medium text-muted-foreground mb-3">Surface Properties</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-area">Area (m²)</Label>
            <Input
              id="prop-area"
              type="number"
              value={node.area ?? ''}
              onChange={(e) => handleChange('area', parseFloat(e.target.value) || null)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              step="0.001"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-mass">Mass (kg)</Label>
            <Input
              id="prop-mass"
              type="number"
              value={node.mass ?? ''}
              onChange={(e) => handleChange('mass', parseFloat(e.target.value) || null)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-abs">α (absorptivity)</Label>
            <Input
              id="prop-abs"
              type="number"
              value={node.absorptivity ?? ''}
              onChange={(e) => handleChange('absorptivity', parseFloat(e.target.value) || null)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-em">ε (emissivity)</Label>
            <Input
              id="prop-em"
              type="number"
              value={node.emissivity ?? ''}
              onChange={(e) => handleChange('emissivity', parseFloat(e.target.value) || null)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
