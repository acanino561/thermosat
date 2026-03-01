'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';

// Type definitions
interface FailureCaseConfig {
  failureType: string;
  params: Record<string, unknown>;
  label: string;
}

export interface RiskMatrixCase {
  caseId: string;
  failureType: string;
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  status: 'pass' | 'warn' | 'fail';
}

export interface RiskMatrixRow {
  nodeId: string;
  nodeName: string;
  tempLimitMin?: number;
  tempLimitMax?: number;
  cases: RiskMatrixCase[];
}

export interface RiskMatrixData {
  analysisId: string;
  cases: Array<{ id: string; failureType: string; label?: string; runId: string }>;
  riskMatrix: RiskMatrixRow[];
}

interface FailureModePanelProps {
  projectId: string;
  modelId: string;
  onAnalysisComplete: (data: RiskMatrixData) => void;
}

const FAILURE_TYPES = [
  { type: 'heater_failure', label: 'Heater Failure', description: 'All constant heater outputs set to 0 W' },
  { type: 'mli_degradation', label: 'MLI Degradation', description: 'MLI emissivity multiplied by degradation factor' },
  { type: 'coating_degradation_eol', label: 'Coating Degradation (EOL)', description: 'Absorptivity increased on surface nodes' },
  { type: 'attitude_loss_tumble', label: 'Attitude Loss / Tumble', description: 'Solar flux averaged over all faces' },
  { type: 'power_budget_reduction', label: 'Power Budget Reduction', description: 'Internal dissipation scaled down' },
  { type: 'conductor_failure', label: 'Conductor Failure', description: 'Selected conductor conductance set to 0' },
  { type: 'component_power_spike', label: 'Component Power Spike', description: 'Selected node heat loads multiplied by spike factor' },
];

export function FailureModePanel({ projectId, modelId, onAnalysisComplete }: FailureModePanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);
  
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [params, setParams] = useState<Record<string, Record<string, unknown>>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCase = (type: string) => {
    setSelected(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const setParam = (type: string, key: string, value: unknown) => {
    setParams(prev => ({ ...prev, [type]: { ...(prev[type] || {}), [key]: value } }));
  };

  const getParam = (type: string, key: string, defaultValue: unknown) => {
    return params[type]?.[key] ?? defaultValue;
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const runAnalysis = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const cases: FailureCaseConfig[] = FAILURE_TYPES
        .filter(ft => selected[ft.type])
        .map(ft => ({
          failureType: ft.type,
          label: ft.label,
          params: params[ft.type] || {},
        }));

      const res = await fetch(`/api/projects/${projectId}/models/${modelId}/failure-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      
      // Fetch results
      const resultRes = await fetch(
        `/api/projects/${projectId}/models/${modelId}/failure-analysis/${data.data.analysisId}/results`
      );
      if (!resultRes.ok) throw new Error('Failed to fetch results');
      const resultData = await resultRes.json();
      onAnalysisComplete(resultData.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-foreground">Failure Mode Analysis</h4>
      </div>
      
      <div className="space-y-2">
        {FAILURE_TYPES.map((ft) => (
          <div key={ft.type} className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id={ft.type}
                checked={!!selected[ft.type]}
                onCheckedChange={() => toggleCase(ft.type)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <Label htmlFor={ft.type} className="text-xs font-medium cursor-pointer">
                  {ft.label}
                </Label>
                <p className="text-xs text-muted-foreground">{ft.description}</p>
              </div>
            </div>
            
            {selected[ft.type] && (
              <div className="ml-6 space-y-1.5 pl-2 border-l border-white/10">
                {ft.type === 'mli_degradation' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-28 shrink-0">Degradation factor</Label>
                    <Input
                      type="number" min={1} max={100} step={0.5}
                      value={String(getParam(ft.type, 'degradationFactor', 5))}
                      onChange={e => setParam(ft.type, 'degradationFactor', parseFloat(e.target.value))}
                      className="h-6 text-xs w-16"
                    />
                  </div>
                )}
                {ft.type === 'coating_degradation_eol' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-28 shrink-0">Absorptivity delta</Label>
                    <Input
                      type="number" min={0} max={0.5} step={0.01}
                      value={String(getParam(ft.type, 'absorbanceDelta', 0.05))}
                      onChange={e => setParam(ft.type, 'absorbanceDelta', parseFloat(e.target.value))}
                      className="h-6 text-xs w-16"
                    />
                  </div>
                )}
                {ft.type === 'power_budget_reduction' && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Power scale: {Math.round(Number(getParam(ft.type, 'powerScaleFactor', 0.5)) * 100)}%
                    </Label>
                    <Slider
                      min={0.1} max={0.9} step={0.05}
                      value={[Number(getParam(ft.type, 'powerScaleFactor', 0.5))]}
                      onValueChange={([v]) => setParam(ft.type, 'powerScaleFactor', v)}
                    />
                  </div>
                )}
                {ft.type === 'conductor_failure' && (
                  <Select
                    value={String(getParam(ft.type, 'conductorId', ''))}
                    onValueChange={v => setParam(ft.type, 'conductorId', v)}
                  >
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue placeholder="Select conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {conductors.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {ft.type === 'component_power_spike' && (
                  <div className="space-y-1.5">
                    <Select
                      value={String(getParam(ft.type, 'nodeId', ''))}
                      onValueChange={v => setParam(ft.type, 'nodeId', v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="Select node" />
                      </SelectTrigger>
                      <SelectContent>
                        {nodes.map(n => (
                          <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-20 shrink-0">Spike factor</Label>
                      <Input
                        type="number" min={1} max={10} step={0.5}
                        value={String(getParam(ft.type, 'spikeFactor', 2))}
                        onChange={e => setParam(ft.type, 'spikeFactor', parseFloat(e.target.value))}
                        className="h-6 text-xs w-16"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button
        size="sm" className="w-full h-7 text-xs"
        disabled={selectedCount === 0 || isRunning}
        onClick={runAnalysis}
      >
        {isRunning ? (
          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Running {selectedCount} case{selectedCount !== 1 ? 's' : ''}...</>
        ) : (
          <>Run {selectedCount} Failure Case{selectedCount !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
}
