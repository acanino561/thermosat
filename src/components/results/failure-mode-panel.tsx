'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';

interface FailureCase {
  failureType: string;
  label: string;
  description: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

interface FailureAnalysisResult {
  analysisId: string;
  status: string;
  cases: Array<{
    id: string;
    failureType: string;
    label: string | null;
    status: string;
    runId: string | null;
  }>;
}

interface FailureModePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  modelId: string;
  onAnalysisComplete: (analysisId: string) => void;
}

const DEFAULT_CASES: FailureCase[] = [
  {
    failureType: 'heater_failure',
    label: 'Heater Failure',
    description: 'Selected heater output set to 0 W',
    enabled: false,
    params: {},
  },
  {
    failureType: 'mli_degradation',
    label: 'MLI Degradation',
    description: 'Increased thermal conductance through MLI layers',
    enabled: false,
    params: { degradationFactor: 5 },
  },
  {
    failureType: 'coating_degradation_eol',
    label: 'Coating Degradation (EOL)',
    description: 'End-of-life absorptivity increase',
    enabled: false,
    params: { absorptivityDelta: 0.05 },
  },
  {
    failureType: 'attitude_loss_tumble',
    label: 'Attitude Loss / Tumble',
    description: 'Loss of attitude control, random tumble',
    enabled: false,
    params: {},
  },
  {
    failureType: 'power_budget_reduction',
    label: 'Power Budget Reduction',
    description: 'Reduced available power for heaters',
    enabled: false,
    params: { powerScale: 0.5 },
  },
  {
    failureType: 'conductor_failure',
    label: 'Conductor Failure',
    description: 'Selected conductor conductance set to 0',
    enabled: false,
    params: { conductorId: '' },
  },
  {
    failureType: 'component_power_spike',
    label: 'Component Power Spike',
    description: 'Sudden power spike on a component',
    enabled: false,
    params: { nodeId: '', spikeFactor: 2 },
  },
];

export function FailureModePanel({
  open,
  onOpenChange,
  projectId,
  modelId,
  onAnalysisComplete,
}: FailureModePanelProps) {
  const [cases, setCases] = useState<FailureCase[]>(DEFAULT_CASES);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodes = useEditorStore((s) => s.nodes);
  const conductors = useEditorStore((s) => s.conductors);

  const enabledCount = cases.filter((c) => c.enabled).length;

  const toggleCase = useCallback((index: number) => {
    setCases((prev) =>
      prev.map((c, i) => (i === index ? { ...c, enabled: !c.enabled } : c)),
    );
  }, []);

  const updateParams = useCallback(
    (index: number, key: string, value: unknown) => {
      setCases((prev) =>
        prev.map((c, i) =>
          i === index ? { ...c, params: { ...c.params, [key]: value } } : c,
        ),
      );
    },
    [],
  );

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    const enabledCases = cases
      .filter((c) => c.enabled)
      .map((c) => ({
        failureType: c.failureType,
        label: c.label,
        params: c.params,
      }));

    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/failure-analysis`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cases: enabledCases }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to run failure analysis');
      }

      const result: FailureAnalysisResult = await res.json();
      onAnalysisComplete(result.analysisId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="font-heading">Failure Mode Analysis</SheetTitle>
          <SheetDescription>
            Select failure cases to simulate and generate a risk matrix.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          <div className="space-y-1 pb-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">
              Select Failure Cases
            </h3>

            {cases.map((c, i) => (
              <div
                key={c.failureType}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  c.enabled
                    ? 'border-orange-500/40 bg-orange-500/5'
                    : 'border-white/10 bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={c.enabled}
                    onCheckedChange={() => toggleCase(i)}
                    disabled={isRunning}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-white/50">{c.description}</p>
                  </div>
                </div>

                {/* Inline config — visible only when enabled */}
                {c.enabled && (
                  <div className="mt-3 pl-12 space-y-3">
                    {c.failureType === 'mli_degradation' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-white/60">
                          Degradation factor
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={c.params.degradationFactor as number}
                          onChange={(e) =>
                            updateParams(i, 'degradationFactor', parseFloat(e.target.value) || 1)
                          }
                          className="h-8 text-sm bg-white/5 border-white/10"
                          disabled={isRunning}
                        />
                      </div>
                    )}

                    {c.failureType === 'coating_degradation_eol' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-white/60">
                          Absorptivity delta
                        </Label>
                        <Input
                          type="number"
                          min={0.01}
                          max={1}
                          step={0.01}
                          value={c.params.absorptivityDelta as number}
                          onChange={(e) =>
                            updateParams(i, 'absorptivityDelta', parseFloat(e.target.value) || 0.01)
                          }
                          className="h-8 text-sm bg-white/5 border-white/10"
                          disabled={isRunning}
                        />
                      </div>
                    )}

                    {c.failureType === 'power_budget_reduction' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-white/60">
                            Power scale
                          </Label>
                          <span className="text-xs text-white/40">
                            {Math.round((c.params.powerScale as number) * 100)}%
                          </span>
                        </div>
                        <Slider
                          min={10}
                          max={90}
                          step={5}
                          value={[Math.round((c.params.powerScale as number) * 100)]}
                          onValueChange={([v]) =>
                            updateParams(i, 'powerScale', v / 100)
                          }
                          disabled={isRunning}
                        />
                      </div>
                    )}

                    {c.failureType === 'conductor_failure' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-white/60">
                          Conductor
                        </Label>
                        <Select
                          value={c.params.conductorId as string}
                          onValueChange={(v) =>
                            updateParams(i, 'conductorId', v)
                          }
                          disabled={isRunning}
                        >
                          <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
                            <SelectValue placeholder="Select conductor" />
                          </SelectTrigger>
                          <SelectContent>
                            {conductors.map((cond) => (
                              <SelectItem key={cond.id} value={cond.id}>
                                {cond.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {c.failureType === 'component_power_spike' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-white/60">
                            Component node
                          </Label>
                          <Select
                            value={c.params.nodeId as string}
                            onValueChange={(v) =>
                              updateParams(i, 'nodeId', v)
                            }
                            disabled={isRunning}
                          >
                            <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
                              <SelectValue placeholder="Select node" />
                            </SelectTrigger>
                            <SelectContent>
                              {nodes.map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                  {n.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-white/60">
                            Spike factor
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            step={0.5}
                            value={c.params.spikeFactor as number}
                            onChange={(e) =>
                              updateParams(i, 'spikeFactor', parseFloat(e.target.value) || 1)
                            }
                            className="h-8 text-sm bg-white/5 border-white/10"
                            disabled={isRunning}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-md p-2 mt-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-white/10 mt-auto">
          <Button
            variant="glow-orange"
            className="w-full gap-2"
            disabled={enabledCount === 0 || isRunning}
            onClick={handleRun}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running {enabledCount} case{enabledCount !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Run Analysis ({enabledCount} case{enabledCount !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
