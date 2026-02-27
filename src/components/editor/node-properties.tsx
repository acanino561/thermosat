'use client';

import { useState } from 'react';
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
import type { QuantityType } from '@/lib/units';

/** Validation bounds in SI units */
const BOUNDS: Partial<Record<string, { min?: number; max?: number }>> = {
  temperature: { min: 0 },       // > 0 K
  boundaryTemp: { min: 0 },      // > 0 K
  capacitance: { min: 0 },       // >= 0 J/K
  area: { min: 0 },              // >= 0 m²
  mass: { min: 0 },              // >= 0 kg
};

interface NodePropertiesProps {
  node: ThermalNode;
}

export function NodeProperties({ node }: NodePropertiesProps) {
  const updateNode = useEditorStore((s) => s.updateNode);
  const { label, display, parse, fmt } = useUnits();
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const handleChange = (field: keyof ThermalNode, value: string | number | null) => {
    updateNode(node.id, { [field]: value });
  };

  /** Validate SI value against bounds; returns error message or null */
  const validate = (field: string, siValue: number, quantity?: QuantityType): string | null => {
    const bound = BOUNDS[field];
    if (!bound) return null;
    if (bound.min != null && siValue < bound.min) {
      const displayMin = quantity ? fmt(bound.min, quantity) : String(bound.min);
      return `Must be ≥ ${displayMin}`;
    }
    if (bound.max != null && siValue > bound.max) {
      const displayMax = quantity ? fmt(bound.max, quantity) : String(bound.max);
      return `Must be ≤ ${displayMax}`;
    }
    return null;
  };

  /** For unit-aware numeric fields: display converted value, store SI */
  const handleUnitChange = (field: keyof ThermalNode, quantity: Parameters<typeof parse>[1], raw: string) => {
    const displayVal = parseFloat(raw);
    if (isNaN(displayVal)) {
      setErrors((prev) => ({ ...prev, [field]: null }));
      handleChange(field, null);
      return;
    }
    const siValue = parse(displayVal, quantity);
    const error = validate(field, siValue, quantity);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return;
    }
    setErrors((prev) => ({ ...prev, [field]: null }));
    handleChange(field, siValue);
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-400 mt-1">{errors[field]}</p> : null;

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
          value={display(node.temperature, 'Temperature')}
          onChange={(e) => handleUnitChange('temperature', 'Temperature', e.target.value)}
          className="bg-white/5 h-8 text-sm"
          step="0.1"
        />
        <FieldError field="temperature" />
      </div>

      {node.nodeType === 'diffusion' && (
        <div className="space-y-2">
          <Label htmlFor="prop-cap">Capacitance ({label('Capacitance')})</Label>
          <Input
            id="prop-cap"
            type="number"
            value={node.capacitance != null ? display(node.capacitance, 'Capacitance') : ''}
            onChange={(e) => handleUnitChange('capacitance', 'Capacitance', e.target.value)}
            className="bg-white/5 h-8 text-sm"
            min="0"
            step="0.1"
          />
          <FieldError field="capacitance" />
        </div>
      )}

      {node.nodeType === 'boundary' && (
        <div className="space-y-2">
          <Label htmlFor="prop-btemp">Boundary Temp ({label('Temperature')})</Label>
          <Input
            id="prop-btemp"
            type="number"
            value={node.boundaryTemp != null ? display(node.boundaryTemp, 'Temperature') : ''}
            onChange={(e) => handleUnitChange('boundaryTemp', 'Temperature', e.target.value)}
            className="bg-white/5 h-8 text-sm"
            step="0.1"
          />
          <FieldError field="boundaryTemp" />
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
              value={node.area != null ? display(node.area, 'Area') : ''}
              onChange={(e) => handleUnitChange('area', 'Area', e.target.value)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              step="0.001"
            />
            <FieldError field="area" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-mass">Mass ({label('Mass')})</Label>
            <Input
              id="prop-mass"
              type="number"
              value={node.mass != null ? display(node.mass, 'Mass') : ''}
              onChange={(e) => handleUnitChange('mass', 'Mass', e.target.value)}
              className="bg-white/5 h-7 text-xs"
              min="0"
              step="0.01"
            />
            <FieldError field="mass" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="prop-abs">α (absorptivity)</Label>
            <Input
              id="prop-abs"
              type="number"
              value={node.absorptivity ?? ''}
              onChange={(e) => { const v = parseFloat(e.target.value); handleChange('absorptivity', isNaN(v) ? null : v); }}
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
              onChange={(e) => { const v = parseFloat(e.target.value); handleChange('emissivity', isNaN(v) ? null : v); }}
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
