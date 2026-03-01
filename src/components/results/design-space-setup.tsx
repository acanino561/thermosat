'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, AlertTriangle, FlaskConical } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';

interface DesignParam {
  entityType: 'node' | 'conductor' | 'heat_load';
  entityId: string;
  property: string;
  minValue: number;
  maxValue: number;
}

interface DesignConstraint {
  nodeId: string;
  tempMin: string;
  tempMax: string;
}

interface DesignSpaceSetupProps {
  projectId: string;
  modelId: string;
  onExplorationComplete: (explorationId: string) => void;
}

export function DesignSpaceSetup({
  projectId,
  modelId,
  onExplorationComplete,
}: DesignSpaceSetupProps) {
  const [parameters, setParameters] = useState<DesignParam[]>([]);
  const [constraints, setConstraints] = useState<DesignConstraint[]>([]);
  const [numSamples, setNumSamples] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);

  const addParameter = () => {
    if (parameters.length >= 5) return;
    setParameters((prev) => [
      ...prev,
      { entityType: 'node', entityId: '', property: '', minValue: 0, maxValue: 1 },
    ]);
  };

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, updates: Partial<DesignParam>) => {
    setParameters((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    );
  };

  const addConstraint = () => {
    setConstraints((prev) => [...prev, { nodeId: '', tempMin: '', tempMax: '' }]);
  };

  const removeConstraint = (index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConstraint = (index: number, updates: Partial<DesignConstraint>) => {
    setConstraints((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    );
  };

  const handleExplore = async () => {
    setIsRunning(true);
    setError(null);

    const payload = {
      parameters: parameters.map((p) => ({
        entityType: p.entityType,
        entityId: p.entityId,
        property: p.property,
        minValue: p.minValue,
        maxValue: p.maxValue,
        numLevels: numSamples,
      })),
      constraints: constraints
        .filter((c) => c.nodeId)
        .map((c) => ({
          nodeId: c.nodeId,
          ...(c.tempMin ? { tempMin: parseFloat(c.tempMin) } : {}),
          ...(c.tempMax ? { tempMax: parseFloat(c.tempMax) } : {}),
        })),
      numSamples,
      samplingMethod: 'lhs' as const,
    };

    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/design-explorations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start exploration');
      }

      const data = await res.json();
      onExplorationComplete(data.data.explorationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const entityOptions = (entityType: string) => {
    if (entityType === 'node') return nodes.map((n) => ({ id: n.id, name: n.name }));
    if (entityType === 'conductor') return conductors.map((c) => ({ id: c.id, name: c.name }));
    return [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-heading font-semibold">Design Space Explorer</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
          Beta
        </span>
      </div>

      {/* Parameters */}
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Parameters (max 5)</Label>
        {parameters.map((param, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={param.entityType}
                onValueChange={(v) => updateParameter(i, { entityType: v as DesignParam['entityType'], entityId: '' })}
                disabled={isRunning}
              >
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="node">Node</SelectItem>
                  <SelectItem value="conductor">Conductor</SelectItem>
                  <SelectItem value="heat_load">Heat Load</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={param.entityId}
                onValueChange={(v) => updateParameter(i, { entityId: v })}
                disabled={isRunning}
              >
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 flex-1">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions(param.entityType).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/40 hover:text-red-400"
                onClick={() => removeParameter(i)}
                disabled={isRunning}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Property"
                value={param.property}
                onChange={(e) => updateParameter(i, { property: e.target.value })}
                className="h-8 text-xs bg-white/5 border-white/10 flex-1"
                disabled={isRunning}
              />
              <Input
                type="number"
                placeholder="Min"
                value={param.minValue}
                onChange={(e) => updateParameter(i, { minValue: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs bg-white/5 border-white/10 w-20"
                disabled={isRunning}
              />
              <Input
                type="number"
                placeholder="Max"
                value={param.maxValue}
                onChange={(e) => updateParameter(i, { maxValue: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs bg-white/5 border-white/10 w-20"
                disabled={isRunning}
              />
            </div>
          </div>
        ))}
        {parameters.length < 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed border-white/20 text-white/50 hover:text-white"
            onClick={addParameter}
            disabled={isRunning}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Parameter
          </Button>
        )}
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Constraints</Label>
        {constraints.map((constraint, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={constraint.nodeId}
              onValueChange={(v) => updateConstraint(i, { nodeId: v })}
              disabled={isRunning}
            >
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 flex-1">
                <SelectValue placeholder="Node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Min K"
              value={constraint.tempMin}
              onChange={(e) => updateConstraint(i, { tempMin: e.target.value })}
              className="h-8 text-xs bg-white/5 border-white/10 w-20"
              disabled={isRunning}
            />
            <Input
              type="number"
              placeholder="Max K"
              value={constraint.tempMax}
              onChange={(e) => updateConstraint(i, { tempMax: e.target.value })}
              className="h-8 text-xs bg-white/5 border-white/10 w-20"
              disabled={isRunning}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-red-400"
              onClick={() => removeConstraint(i)}
              disabled={isRunning}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs border-dashed border-white/20 text-white/50 hover:text-white"
          onClick={addConstraint}
          disabled={isRunning}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Constraint
        </Button>
      </div>

      {/* Samples slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-white/60">Samples</Label>
          <span className="text-xs text-white/40">{numSamples}</span>
        </div>
        <Slider
          min={10}
          max={100}
          step={1}
          value={[numSamples]}
          onValueChange={([v]) => setNumSamples(v)}
          disabled={isRunning}
        />
        {numSamples > 50 && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            High sample count may take a while
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-md p-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        variant="glow-orange"
        className="w-full gap-2"
        disabled={parameters.length === 0 || isRunning}
        onClick={handleExplore}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exploring…
          </>
        ) : (
          <>
            <FlaskConical className="h-4 w-4" />
            Explore
          </>
        )}
      </Button>
    </div>
  );
}
