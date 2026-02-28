'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Loader2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sun,
  Snowflake,
  Thermometer,
  X,
} from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import type { ValidationResult, ValidationError } from '@/app/api/projects/[id]/models/[mid]/validate/route';

type EnvironmentPresetName = 'hot' | 'cold' | 'nominal' | 'custom';

interface EnvironmentPreset {
  name: EnvironmentPresetName;
  label: string;
  icon: typeof Sun;
  solarFlux: number;
  albedo: number;
  earthIR: number;
}

const PRESETS: EnvironmentPreset[] = [
  {
    name: 'hot',
    label: 'Hot Case',
    icon: Sun,
    solarFlux: 1414,
    albedo: 0.35,
    earthIR: 216,
  },
  {
    name: 'cold',
    label: 'Cold Case',
    icon: Snowflake,
    solarFlux: 1322,
    albedo: 0.25,
    earthIR: 236,
  },
  {
    name: 'nominal',
    label: 'Nominal',
    icon: Thermometer,
    solarFlux: 1367,
    albedo: 0.30,
    earthIR: 226,
  },
];

interface SimulationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimulationConfigDialog({ open, onOpenChange }: SimulationConfigDialogProps) {
  const { projectId, modelId, simulationStatus } = useEditorStore();

  // Transient config
  const [duration, setDuration] = useState(3600);
  const [timeStep, setTimeStep] = useState(10);
  const [outputInterval, setOutputInterval] = useState(60);
  const [transientTolerance, setTransientTolerance] = useState(1e-6);
  const [minStep, setMinStep] = useState(0.01);
  const [maxStep, setMaxStep] = useState(100);

  // Steady-state config
  const [maxIterations, setMaxIterations] = useState(1000);
  const [ssTolerance, setSsTolerance] = useState(1e-4);

  // Environment preset
  const [selectedPreset, setSelectedPreset] = useState<EnvironmentPresetName>('nominal');
  const [solarFlux, setSolarFlux] = useState(1367);
  const [albedo, setAlbedo] = useState(0.30);
  const [earthIR, setEarthIR] = useState(226);

  // Simulation type
  const [simType, setSimType] = useState<'transient' | 'steady_state'>('transient');

  // Validation state
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runComplete, setRunComplete] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply preset
  const applyPreset = useCallback((presetName: EnvironmentPresetName) => {
    setSelectedPreset(presetName);
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setSolarFlux(preset.solarFlux);
      setAlbedo(preset.albedo);
      setEarthIR(preset.earthIR);
    }
  }, []);

  // Validate model
  const handleValidate = useCallback(async () => {
    if (!projectId || !modelId) return;
    setIsValidating(true);
    setRunError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/models/${modelId}/validate`, {
        method: 'POST',
      });
      const result: ValidationResult = await res.json();
      setValidation(result);
    } catch {
      setValidation(null);
    } finally {
      setIsValidating(false);
    }
  }, [projectId, modelId]);

  // Auto-validate on open
  useEffect(() => {
    if (open) {
      handleValidate();
      setRunComplete(false);
      setRunError(null);
      setIsRunning(false);
      setRunProgress(0);
      setCurrentRunId(null);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, handleValidate]);

  // Poll for progress
  const startPolling = useCallback((runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!projectId || !modelId) return;
      try {
        const res = await fetch(
          `/api/projects/${projectId}/models/${modelId}/simulate/${runId}`,
        );
        const run = await res.json();
        setRunProgress(run.progress ?? 0);

        if (run.status === 'completed') {
          setIsRunning(false);
          setRunComplete(true);
          setRunProgress(100);
          if (pollRef.current) clearInterval(pollRef.current);
          // Load results into editor store
          const store = useEditorStore.getState();
          // Fetch full results
          const resultsRes = await fetch(
            `/api/projects/${projectId}/models/${modelId}/results/${runId}`,
          );
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json();
            useEditorStore.setState({
              simulationStatus: 'completed',
              simulationResults: resultsData,
              showResultsOverlay: true,
              activeView: 'results',
            });
          }
        } else if (run.status === 'failed') {
          setIsRunning(false);
          setRunError(run.errorMessage || 'Simulation failed');
          setRunProgress(100);
          if (pollRef.current) clearInterval(pollRef.current);
          useEditorStore.setState({ simulationStatus: 'failed' });
        } else if (run.status === 'cancelled') {
          setIsRunning(false);
          setRunError('Simulation was cancelled');
          if (pollRef.current) clearInterval(pollRef.current);
          useEditorStore.setState({ simulationStatus: 'idle' });
        }
      } catch {
        // Polling error, keep trying
      }
    }, 1000);
  }, [projectId, modelId]);

  // Run simulation
  const handleRun = useCallback(async () => {
    if (!projectId || !modelId) return;
    if (validation && !validation.valid) return;

    setIsRunning(true);
    setRunError(null);
    setRunComplete(false);
    setRunProgress(0);
    useEditorStore.setState({ simulationStatus: 'running' });

    const config = simType === 'transient'
      ? {
          simulationType: 'transient' as const,
          config: {
            timeStart: 0,
            timeEnd: duration,
            timeStep,
            maxIterations: 10000,
            tolerance: transientTolerance,
            minStep,
            maxStep,
          },
        }
      : {
          simulationType: 'steady_state' as const,
          config: {
            timeStart: 0,
            timeEnd: 0,
            timeStep: 1,
            maxIterations,
            tolerance: ssTolerance,
          },
        };

    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/simulate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setIsRunning(false);
        setRunError(data.details || data.error || 'Simulation failed');
        useEditorStore.setState({ simulationStatus: 'failed' });
        return;
      }

      // If completed synchronously (which is how the current backend works)
      if (data.run?.status === 'completed') {
        setIsRunning(false);
        setRunComplete(true);
        setRunProgress(100);
        setCurrentRunId(data.run.id);

        // Fetch full results and load into store
        const resultsRes = await fetch(
          `/api/projects/${projectId}/models/${modelId}/results/${data.run.id}`,
        );
        if (resultsRes.ok) {
          const resultsData = await resultsRes.json();
          useEditorStore.setState({
            simulationStatus: 'completed',
            simulationResults: resultsData,
            showResultsOverlay: true,
            activeView: 'results',
          });
        } else {
          // Still mark as complete even if results fetch fails
          useEditorStore.setState({
            simulationStatus: 'completed',
            simulationResults: data,
            showResultsOverlay: true,
            activeView: 'results',
          });
        }
      } else if (data.run?.id) {
        // Async — poll for progress
        setCurrentRunId(data.run.id);
        startPolling(data.run.id);
      }
    } catch (err) {
      setIsRunning(false);
      setRunError(err instanceof Error ? err.message : 'Network error');
      useEditorStore.setState({ simulationStatus: 'failed' });
    }
  }, [
    projectId, modelId, validation, simType, duration, timeStep, transientTolerance,
    minStep, maxStep, maxIterations, ssTolerance, startPolling,
  ]);

  // Cancel simulation
  const handleCancel = useCallback(async () => {
    if (!projectId || !modelId || !currentRunId) return;
    try {
      await fetch(
        `/api/projects/${projectId}/models/${modelId}/simulate/${currentRunId}/cancel`,
        { method: 'POST' },
      );
      setIsRunning(false);
      setRunError('Simulation cancelled');
      if (pollRef.current) clearInterval(pollRef.current);
      useEditorStore.setState({ simulationStatus: 'idle' });
    } catch {
      // Ignore cancel errors
    }
  }, [projectId, modelId, currentRunId]);

  const renderValidationMessages = (items: ValidationError[], type: 'error' | 'warning') => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5 mt-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${
              type === 'error'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            {type === 'error' ? (
              <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Simulation Configuration</DialogTitle>
          <DialogDescription>
            Configure solver parameters and environment settings before running.
          </DialogDescription>
        </DialogHeader>

        {/* Simulation type selector */}
        <div className="flex gap-2 mb-2">
          <Button
            variant={simType === 'transient' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSimType('transient')}
          >
            Transient
          </Button>
          <Button
            variant={simType === 'steady_state' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSimType('steady_state')}
          >
            Steady State
          </Button>
        </div>

        <Tabs defaultValue="solver" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="solver" className="flex-1">Solver</TabsTrigger>
            <TabsTrigger value="environment" className="flex-1">Environment</TabsTrigger>
            <TabsTrigger value="validation" className="flex-1">
              Validation
              {validation && !validation.valid && (
                <Badge variant="destructive" className="ml-1.5 text-[10px] px-1 py-0">
                  {validation.errors.length}
                </Badge>
              )}
              {validation && validation.valid && validation.warnings.length > 0 && (
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-yellow-400 border-yellow-400">
                  {validation.warnings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Solver Tab */}
          <TabsContent value="solver" className="space-y-4 mt-4">
            {simType === 'transient' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="duration" className="text-xs">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="timeStep" className="text-xs">Time Step (seconds)</Label>
                    <Input
                      id="timeStep"
                      type="number"
                      value={timeStep}
                      onChange={(e) => setTimeStep(Number(e.target.value))}
                      min={0.001}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputInterval" className="text-xs">Output Interval (seconds)</Label>
                    <Input
                      id="outputInterval"
                      type="number"
                      value={outputInterval}
                      onChange={(e) => setOutputInterval(Number(e.target.value))}
                      min={0.1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tolerance" className="text-xs">Tolerance</Label>
                    <Input
                      id="tolerance"
                      type="number"
                      value={transientTolerance}
                      onChange={(e) => setTransientTolerance(Number(e.target.value))}
                      step={1e-7}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minStep" className="text-xs">Min Step (seconds)</Label>
                    <Input
                      id="minStep"
                      type="number"
                      value={minStep}
                      onChange={(e) => setMinStep(Number(e.target.value))}
                      min={1e-6}
                      step={0.001}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxStep" className="text-xs">Max Step (seconds)</Label>
                    <Input
                      id="maxStep"
                      type="number"
                      value={maxStep}
                      onChange={(e) => setMaxStep(Number(e.target.value))}
                      min={0.1}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxIter" className="text-xs">Max Iterations</Label>
                  <Input
                    id="maxIter"
                    type="number"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ssTolerance" className="text-xs">Convergence Tolerance</Label>
                  <Input
                    id="ssTolerance"
                    type="number"
                    value={ssTolerance}
                    onChange={(e) => setSsTolerance(Number(e.target.value))}
                    step={1e-5}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-xs font-medium">Environment Preset</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <Button
                      key={preset.name}
                      variant={selectedPreset === preset.name ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => applyPreset(preset.name)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="solarFlux" className="text-xs">Solar Flux (W/m²)</Label>
                <Input
                  id="solarFlux"
                  type="number"
                  value={solarFlux}
                  onChange={(e) => {
                    setSolarFlux(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="albedo" className="text-xs">Albedo</Label>
                <Input
                  id="albedo"
                  type="number"
                  value={albedo}
                  onChange={(e) => {
                    setAlbedo(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  step={0.01}
                  min={0}
                  max={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="earthIR" className="text-xs">Earth IR (W/m²)</Label>
                <Input
                  id="earthIR"
                  type="number"
                  value={earthIR}
                  onChange={(e) => {
                    setEarthIR(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted/50">
              <strong>Hot case:</strong> Maximum solar flux, highest albedo, minimum Earth IR —
              worst-case thermal input.
              <br />
              <strong>Cold case:</strong> Minimum solar flux, lowest albedo, maximum Earth IR —
              worst-case thermal rejection.
              <br />
              <strong>Nominal:</strong> Typical values for standard mission analysis.
            </div>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Pre-run model validation
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Re-validate
              </Button>
            </div>

            {validation && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {validation.summary.nodeCount} nodes
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {validation.summary.conductorCount} conductors
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {validation.summary.heatLoadCount} heat loads
                  </Badge>
                  {validation.summary.hasOrbitalConfig && (
                    <Badge variant="outline" className="text-[10px]">
                      Orbital config ✓
                    </Badge>
                  )}
                </div>

                {/* Status */}
                {validation.valid ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Model is valid — ready to simulate
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <XCircle className="h-4 w-4" />
                    {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} must
                    be fixed before running
                  </div>
                )}

                {renderValidationMessages(validation.errors, 'error')}
                {renderValidationMessages(validation.warnings, 'warning')}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Progress / Run State */}
        {(isRunning || runComplete || runError) && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            {isRunning && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running... {runProgress}% complete
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                </div>
                <Progress value={runProgress} className="h-2" />
              </>
            )}

            {runComplete && !isRunning && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Simulation completed successfully
              </div>
            )}

            {runError && !isRunning && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <XCircle className="h-4 w-4" />
                  {runError}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {runComplete ? 'Close' : 'Cancel'}
          </Button>
          {!runComplete && (
            <Button
              onClick={handleRun}
              disabled={
                isRunning ||
                isValidating ||
                (validation !== null && !validation.valid)
              }
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run {simType === 'transient' ? 'Transient' : 'Steady State'}
                </>
              )}
            </Button>
          )}
          {runComplete && (
            <Button onClick={() => onOpenChange(false)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              View Results
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
