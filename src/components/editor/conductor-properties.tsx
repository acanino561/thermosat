'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEditorStore, type Conductor } from '@/lib/stores/editor-store';
import { useUnits } from '@/lib/hooks/use-units';
import type { QuantityType } from '@/lib/units';

interface ConductorPropertiesProps {
  conductor: Conductor;
}

export function ConductorProperties({ conductor }: ConductorPropertiesProps) {
  const updateConductor = useEditorStore((s) => s.updateConductor);
  const nodes = useEditorStore((s) => s.nodes);
  const { label, display, parse, fmt } = useUnits();
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const fromNode = nodes.find((n) => n.id === conductor.nodeFromId);
  const toNode = nodes.find((n) => n.id === conductor.nodeToId);

  /** Validation bounds in SI units */
  const BOUNDS: Record<string, { min?: number; max?: number; exclusive?: boolean; quantity?: QuantityType }> = {
    conductance: { min: 0, exclusive: true, quantity: 'Conductance' },
    area:        { min: 0, exclusive: true, quantity: 'Area' },
    viewFactor:  { min: 0, max: 1 },
    emissivity:  { min: 0, max: 1 },
  };

  const validate = (field: string, siValue: number): string | null => {
    const bound = BOUNDS[field];
    if (!bound) return null;
    if (bound.min != null) {
      if (bound.exclusive && siValue <= bound.min) {
        const displayMin = bound.quantity ? fmt(bound.min, bound.quantity) : String(bound.min);
        return `Must be > ${displayMin}`;
      }
      if (!bound.exclusive && siValue < bound.min) {
        const displayMin = bound.quantity ? fmt(bound.min, bound.quantity) : String(bound.min);
        return `Must be ≥ ${displayMin}`;
      }
    }
    if (bound.max != null && siValue > bound.max) {
      return `Must be ≤ ${bound.max}`;
    }
    return null;
  };

  const handleChange = (field: keyof Conductor, value: string | number | null) => {
    updateConductor(conductor.id, { [field]: value });
  };

  const handleValidatedChange = (field: string, value: number | null) => {
    if (value != null) {
      const error = validate(field, value);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        return;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: null }));
    handleChange(field as keyof Conductor, value);
  };

  const handleUnitChange = (field: keyof Conductor, quantity: Parameters<typeof parse>[1], raw: string) => {
    const displayVal = parseFloat(raw);
    if (isNaN(displayVal)) {
      setErrors((prev) => ({ ...prev, [field]: null }));
      handleChange(field, null);
      return;
    }
    const siValue = parse(displayVal, quantity);
    const error = validate(field, siValue);
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
          <Label htmlFor="cond-g">Conductance ({label('Conductance')})</Label>
          <Input
            id="cond-g"
            type="number"
            value={conductor.conductance != null ? display(conductor.conductance, 'Conductance') : ''}
            onChange={(e) => handleUnitChange('conductance', 'Conductance', e.target.value)}
            className="bg-white/5 h-8 text-sm"
            min="0"
            step="0.001"
          />
          <FieldError field="conductance" />
        </div>
      )}

      {conductor.conductorType === 'radiation' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cond-area">Area ({label('Area')})</Label>
            <Input
              id="cond-area"
              type="number"
              value={conductor.area != null ? display(conductor.area, 'Area') : ''}
              onChange={(e) => handleUnitChange('area', 'Area', e.target.value)}
              className="bg-white/5 h-8 text-sm"
              min="0"
              step="0.0001"
            />
            <FieldError field="area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="cond-vf">View Factor</Label>
              <Input
                id="cond-vf"
                type="number"
                value={conductor.viewFactor ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isNaN(v)) { handleValidatedChange('viewFactor', null); return; }
                  handleValidatedChange('viewFactor', v);
                }}
                className="bg-white/5 h-7 text-xs"
                min="0"
                max="1"
                step="0.01"
              />
              <FieldError field="viewFactor" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="cond-em">Emissivity</Label>
              <Input
                id="cond-em"
                type="number"
                value={conductor.emissivity ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isNaN(v)) { handleValidatedChange('emissivity', null); return; }
                  handleValidatedChange('emissivity', v);
                }}
                className="bg-white/5 h-7 text-xs"
                min="0"
                max="1"
                step="0.01"
              />
              <FieldError field="emissivity" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
