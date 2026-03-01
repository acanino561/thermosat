'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditorStore } from '@/lib/stores/editor-store';
import { Loader2, AlertTriangle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

export interface RiskMatrixCase {
  caseId: string;
  failureType: string;
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  status?: 'pass' | 'warn' | 'fail';
}

export interface RiskMatrixRow {
  nodeId: string;
  nodeName: string;
  tempLimitMin?: number | null;
  tempLimitMax?: number | null;
  cases: RiskMatrixCase[];
}

export interface RiskMatrixData {
  analysisId: string;
  cases: Array<{ id: string; failureType: string; label?: string | null; runId: string | null }>;
  riskMatrix: RiskMatrixRow[];
}

interface FailureModePanelProps {
  projectId: string;
  modelId: string;
  onAnalysisComplete: (data: RiskMatrixData) => void;
}

// ─── Failure type definitions ───────────────────────────────────────────

interface FailureTypeDef {
  key: string;
  label: string;
  hasParams: boolean;
}

const FAILURE_TYPES: FailureTypeDef[] = [
  { key: 'heater_failure', label: 'Heater Failure', hasParams: false },
  { key: 'mli_degradation', label: 'MLI Degradation', hasParams: true },
  { key: 'coating_degradation_eol', label: 'Coating Degradation (EOL)', hasParams: true },
  { key: 'attitude_loss_tumble', label: 'Attitude Loss / Tumble', hasParams: false },
  { key: 'power_budget_reduction', label: 'Power Budget Reduction', hasParams: true },
  { key: 'conductor_failure', label: 'Conductor Failure', hasParams: true },
  { key: 'component_power_spike', label: 'Component Power Spike', hasParams: true },
];

// ─── Component ──────────────────────────────────────────────────────────

export function FailureModePanel({ projectId, modelId, onAnalysisComplete }: FailureModePanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [params, setParams] = useState<Record<string, Record<string, number | string>>>({
    mli_degradation: { degradationFactor: 5 },
    coating_degradation_eol: { absorptivityDelta: 0.05 },
    power_budget_reduction: { reductionFactor: 0.5 },
    conductor_failure: { conductorId: '' },
    component_power_spike: { nodeId: '', spikeFactor: 2 },
  });
  const [isRunning, setIsRunning] = useState(false);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  const toggleCase = useCallback((key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateParam = useCallback((failureType: string, paramKey: string, value: number | string) => {
    setParams((prev) => ({
      ...prev,
      [failureType]: { ...prev[failureType], [paramKey]: value },
    }));
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    try {
      const cases = FAILURE_TYPES
        .filter((ft) => selected[ft.key])
        .map((ft) => {
          const caseObj: { failureType: string; params?: Record<string, number | string> } = {
            failureType: ft.key,
          };
          if (ft.hasParams && params[ft.key]) {
            caseObj.params = { ...params[ft.key] };
          }
          return caseObj;
        });

      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/failure-analysis`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cases }),
        },
      );

      if (!res.ok) {
        console.error('Failure analysis POST failed:', await res.text());
        return;
      }

      const data = await res.json();
      const analysisId = data.analysisId as string;

      // Fetch results
      const resultsRes = await fetch(
        `/api/projects/${projectId}/models/${modelId}/failure-analysis/${analysisId}/results`,
      );

      if (!resultsRes.ok) {
        console.error('Failure analysis results fetch failed:', await resultsRes.text());
        return;
      }

      const riskMatrixData: RiskMatrixData = await resultsRes.json();
      onAnalysisComplete(riskMatrixData);
    } catch (error) {
      console.error('Failure analysis error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [selected, params, projectId, modelId, onAnalysisComplete]);

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <h3 className="font-heading text-sm font-semibold">Failure Mode Analysis</h3>
      </div>

      {/* Failure type checkboxes */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        {FAILURE_TYPES.map((ft) => (
          <div key={ft.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`fm-${ft.key}`}
                checked={!!selected[ft.key]}
                onCheckedChange={() => toggleCase(ft.key)}
              />
              <label
                htmlFor={`fm-${ft.key}`}
                className="text-xs font-mono text-slate-300 cursor-pointer"
              >
                {ft.label}
              </label>
            </div>

            {/* Inline params when selected */}
            {selected[ft.key] && ft.key === 'mli_degradation' && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">Degradation factor</span>
                <Input
                  type="number"
                  value={params.mli_degradation?.degradationFactor ?? 5}
                  onChange={(e) => updateParam('mli_degradation', 'degradationFactor', parseFloat(e.target.value) || 5)}
                  className="h-6 w-16 text-xs font-mono bg-white/5 border-white/10"
                />
              </div>
            )}

            {selected[ft.key] && ft.key === 'coating_degradation_eol' && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">Absorptivity delta</span>
                <Input
                  type="number"
                  step={0.01}
                  value={params.coating_degradation_eol?.absorptivityDelta ?? 0.05}
                  onChange={(e) => updateParam('coating_degradation_eol', 'absorptivityDelta', parseFloat(e.target.value) || 0.05)}
                  className="h-6 w-16 text-xs font-mono bg-white/5 border-white/10"
                />
              </div>
            )}

            {selected[ft.key] && ft.key === 'power_budget_reduction' && (
              <div className="ml-6 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">Reduction</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round((params.power_budget_reduction?.reductionFactor as number ?? 0.5) * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[params.power_budget_reduction?.reductionFactor as number ?? 0.5]}
                  onValueChange={([v]) => updateParam('power_budget_reduction', 'reductionFactor', v)}
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-600">
                  <span>10%</span>
                  <span>90%</span>
                </div>
              </div>
            )}

            {selected[ft.key] && ft.key === 'conductor_failure' && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">Conductor</span>
                <Select
                  value={params.conductor_failure?.conductorId as string ?? ''}
                  onValueChange={(v) => updateParam('conductor_failure', 'conductorId', v)}
                >
                  <SelectTrigger className="h-6 w-40 text-xs font-mono bg-white/5 border-white/10">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {conductors.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selected[ft.key] && ft.key === 'component_power_spike' && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">Node</span>
                  <Select
                    value={params.component_power_spike?.nodeId as string ?? ''}
                    onValueChange={(v) => updateParam('component_power_spike', 'nodeId', v)}
                  >
                    <SelectTrigger className="h-6 w-40 text-xs font-mono bg-white/5 border-white/10">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((n) => (
                        <SelectItem key={n.id} value={n.id} className="text-xs font-mono">
                          {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">Spike factor</span>
                  <Input
                    type="number"
                    value={params.component_power_spike?.spikeFactor ?? 2}
                    onChange={(e) => updateParam('component_power_spike', 'spikeFactor', parseFloat(e.target.value) || 2)}
                    className="h-6 w-16 text-xs font-mono bg-white/5 border-white/10"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Run button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRun}
        disabled={selectedCount === 0 || isRunning}
        className={cn(
          'text-xs font-mono gap-1.5 h-7 w-full',
          'text-red-400 hover:text-red-300 hover:bg-red-500/10',
        )}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Running analysis…
          </>
        ) : (
          <>
            <Play className="h-3 w-3" />
            Run Analysis ({selectedCount} case{selectedCount !== 1 ? 's' : ''})
          </>
        )}
      </Button>
    </div>
  );
}
