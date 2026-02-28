'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/stores/editor-store';
import {
  type SensitivityData,
  type SensitivityEntry,
  computeAccuracyScore,
  getParameterAccuracy,
  getParameterUnit,
  getParameterRange,
} from '@/lib/what-if/sensitivity-calc';
import { Loader2, RotateCcw, Play, Beaker } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatIfPanelProps {
  projectId: string;
  modelId: string;
  runId: string | null;
}

const ACCURACY_ICONS: Record<string, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
};

export function WhatIfPanel({ projectId, modelId, runId }: WhatIfPanelProps) {
  const [sensitivityData, setSensitivityData] = useState<SensitivityData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const whatIfEnabled = useEditorStore((s) => s.whatIfEnabled);
  const whatIfDeltas = useEditorStore((s) => s.whatIfDeltas);
  const setWhatIfEnabled = useEditorStore((s) => s.setWhatIfEnabled);
  const setWhatIfDeltas = useEditorStore((s) => s.setWhatIfDeltas);
  const resetWhatIf = useEditorStore((s) => s.resetWhatIf);
  const setWhatIfSensitivityEntries = useEditorStore((s) => s.setWhatIfSensitivityEntries);

  // Poll sensitivity API
  const fetchSensitivity = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/results/${runId}/sensitivity`,
      );
      if (!res.ok) return;
      const data: SensitivityData = await res.json();
      setSensitivityData(data);

      // Sync entries to store for other components (chart, viewport)
      if (data.status === 'complete' && data.entries.length > 0) {
        setWhatIfSensitivityEntries(data.entries);
      }

      // Stop polling if terminal state
      if (data.status === 'complete' || data.status === 'failed' || data.status === 'not_available') {
        setIsPolling(false);
      }
    } catch {
      // Silently ignore fetch errors during polling
    }
  }, [projectId, modelId, runId]);

  useEffect(() => {
    if (!runId) return;
    fetchSensitivity();
    setIsPolling(true);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, fetchSensitivity]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!isPolling) return;

    pollRef.current = setInterval(fetchSensitivity, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isPolling, fetchSensitivity]);

  const entries = sensitivityData?.entries ?? [];
  const status = sensitivityData?.status ?? 'not_available';

  const accuracyScore = useMemo(
    () => computeAccuracyScore(entries, whatIfDeltas),
    [entries, whatIfDeltas],
  );

  const hasAnyDelta = useMemo(
    () => Object.values(whatIfDeltas).some((d) => Math.abs(d) > 1e-12),
    [whatIfDeltas],
  );

  const handleSliderChange = useCallback(
    (parameterId: string, value: number, baseline: number) => {
      const delta = value - baseline;
      setWhatIfDeltas({ ...whatIfDeltas, [parameterId]: delta });
    },
    [whatIfDeltas, setWhatIfDeltas],
  );

  const handleReset = useCallback(() => {
    resetWhatIf();
  }, [resetWhatIf]);

  // Don't render anything if status is failed or not_available
  if (status === 'failed' || status === 'not_available') return null;

  // Show loading state
  if (status === 'pending' || status === 'running') {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
          <span className="font-mono text-xs">Computing sensitivity matrix…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-amber-400" />
          <h3 className="font-heading text-sm font-semibold">What If Analysis</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWhatIfEnabled(!whatIfEnabled)}
          className={cn(
            'text-xs font-mono h-7 px-3',
            whatIfEnabled && 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
          )}
        >
          {whatIfEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* Sliders — only when enabled */}
      {whatIfEnabled && (
        <>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {entries.map((entry) => (
              <ParameterSlider
                key={entry.parameterId}
                entry={entry}
                delta={whatIfDeltas[entry.parameterId] ?? 0}
                onChange={(value, baseline) => handleSliderChange(entry.parameterId, value, baseline)}
              />
            ))}
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">No sensitivity parameters available.</p>
            )}
          </div>

          {/* Global accuracy badge */}
          {hasAnyDelta && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/5">
              <span className="text-xs font-mono text-muted-foreground">
                Linear approx — {accuracyScore}% confidence
              </span>
              <span className="text-xs">
                {accuracyScore >= 90 ? '🟢' : accuracyScore >= 70 ? '🟡' : '🔴'}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasAnyDelta}
              className="text-xs font-mono gap-1.5 h-7"
            >
              <RotateCcw className="h-3 w-3" />
              Reset sliders
            </Button>
            <RerunButton
              projectId={projectId}
              modelId={modelId}
              entries={entries}
              deltas={whatIfDeltas}
              disabled={!hasAnyDelta}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Parameter Slider ───────────────────────────────────────────────────

interface ParameterSliderProps {
  entry: SensitivityEntry;
  delta: number;
  onChange: (value: number, baseline: number) => void;
}

function ParameterSlider({ entry, delta, onChange }: ParameterSliderProps) {
  const range = useMemo(
    () => getParameterRange(entry),
    [entry],
  );

  const unit = getParameterUnit(entry.parameterId, entry.parameterType);
  const currentValue = range.baseline + delta;
  const accuracy = getParameterAccuracy(entry, delta, range.baseline);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-300 truncate max-w-[70%]" title={entry.parameterLabel}>
          {entry.parameterLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <span>{ACCURACY_ICONS[accuracy]}</span>
          <span>
            {currentValue.toFixed(range.step < 0.1 ? 2 : 1)}
            {unit ? ` ${unit}` : ''}
          </span>
        </span>
      </div>
      <Slider
        min={range.min}
        max={range.max}
        step={range.step}
        value={[currentValue]}
        onValueChange={([v]) => onChange(v, range.baseline)}
      />
      <div className="flex justify-between text-[9px] font-mono text-slate-600">
        <span>{range.min}{unit ? ` ${unit}` : ''}</span>
        <span className="text-slate-500">baseline: {range.baseline}{unit ? ` ${unit}` : ''}</span>
        <span>{range.max}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
}

// ─── Re-run Button ──────────────────────────────────────────────────────

interface RerunButtonProps {
  projectId: string;
  modelId: string;
  entries: SensitivityEntry[];
  deltas: Record<string, number>;
  disabled: boolean;
}

function RerunButton({ projectId, modelId, entries, deltas, disabled }: RerunButtonProps) {
  const runSimulation = useEditorStore((s) => s.runSimulation);
  const simulationStatus = useEditorStore((s) => s.simulationStatus);
  const nodes = useEditorStore((s) => s.nodes);
  const updateNode = useEditorStore((s) => s.updateNode);
  const conductors = useEditorStore((s) => s.conductors);
  const updateConductor = useEditorStore((s) => s.updateConductor);
  const heatLoads = useEditorStore((s) => s.heatLoads);
  const updateHeatLoad = useEditorStore((s) => s.updateHeatLoad);

  const handleRerun = useCallback(() => {
    // Apply deltas to model parameters before re-running
    for (const entry of entries) {
      const dp = deltas[entry.parameterId];
      if (!dp) continue;
      const range = getParameterRange(entry);
      const newValue = range.baseline + dp;

      if (entry.parameterType === 'node_property') {
        const update: Record<string, number> = {};
        if (entry.parameterId.includes('absorptivity')) update.absorptivity = newValue;
        else if (entry.parameterId.includes('emissivity')) update.emissivity = newValue;
        else if (entry.parameterId.includes('mass')) update.mass = newValue;
        else if (entry.parameterId.includes('capacitance')) update.capacitance = newValue;
        if (Object.keys(update).length > 0) {
          updateNode(entry.entityId, update);
        }
      } else if (entry.parameterType === 'conductor') {
        updateConductor(entry.entityId, { conductance: newValue });
      } else if (entry.parameterType === 'heat_load') {
        updateHeatLoad(entry.entityId, { value: newValue });
      }
    }

    // Trigger simulation with default config (matching existing pattern)
    runSimulation({
      simulationType: 'transient',
      config: {
        timeStart: 0,
        timeEnd: 5400,
        timeStep: 10,
        maxIterations: 1000,
        tolerance: 0.01,
      },
    });
  }, [entries, deltas, updateNode, updateConductor, updateHeatLoad, runSimulation]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRerun}
      disabled={disabled || simulationStatus === 'running'}
      className="text-xs font-mono gap-1.5 h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
    >
      <Play className="h-3 w-3" />
      Re-run with these values
    </Button>
  );
}
