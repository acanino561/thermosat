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
import { useUnits } from '@/lib/hooks/use-units';

interface NodePropertiesProps {
  node: ThermalNode;
}

export function NodeProperties({ node }: NodePropertiesProps) {
  const updateNode = useEditorStore((s) => s.updateNode);
  const { label, display, parse } = useUnits();

  const handleChange = (field: keyof ThermalNode, value: string | number | null) => {
    updateNode(node.id, { [field]: value });
  };

  /** For unit-aware numeric fields: display converted value, store SI */
  const handleUnitChange = (field: keyof ThermalNode, quantity: Parameters<typeof parse>[1], raw: string) => {
    const displayVal = parseFloat(raw);
    if (isNaN(displayVal)) {
      handleChange(field, null);
      return;
    }
    handleChange(field, parse(displayVal, quantity));
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
        <Label htmlFor="prop-temp">Temperature ({label('Temperature')})</Label>
        <Input
          id="prop-temp"
          type="number"
          value={parseFloat(display(node.temperature, 'Temperature').toFixed(4))}
          onChange={(e) => handleUnitChange('temperature', 'Temperature', e.target.value)}
          className="bg-white/5 h-8 text-sm"
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
          <Label htmlFor="prop-btemp">Boundary Temp ({label('Temperature')})</Label>
          <Input
            id="prop-btemp"
            type="number"
            value={node.boundaryTemp != null ? parseFloat(display(node.boundaryTemp, 'Temperature').toFixed(4)) : ''}
            onChange={(e) => handleUnitChange('boundaryTemp', 'Temperature', e.target.value)}
            className="bg-white/5 h-8 text-sm"
            step="0.1"
          />
        </div>
      )}

      <div className="pt-2 border-t border-white/10">
        <p className="text-xs font-medium text-muted-foreground mb-3">Surface Properties</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-area">Area ({label('Area')})</Label>
            <Input
              id="prop-area"
              type="number"
              value={node.area != null ? parseFloat(display(node.area, 'Area').toFixed(6)) : ''}
              onChange={(e) => handleUnitChange('area', 'Area', e.target.value)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              step="0.001"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-mass">Mass ({label('Mass')})</Label>
            <Input
              id="prop-mass"
              type="number"
              value={node.mass != null ? parseFloat(display(node.mass, 'Mass').toFixed(4)) : ''}
              onChange={(e) => handleUnitChange('mass', 'Mass', e.target.value)}
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
