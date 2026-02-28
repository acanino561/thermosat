'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEditorStore, type Conductor, type ConductanceDataPoint } from '@/lib/stores/editor-store';
import { useUnits } from '@/lib/hooks/use-units';
import type { QuantityType } from '@/lib/units';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Calculator, Loader2 } from 'lucide-react';
import {
  buildSurfaceData,
  hasGeometryForConductor,
  computeViewFactorAsync,
  RAY_COUNTS,
  type RayQuality,
  type ViewFactorProgress,
  type ViewFactorResult,
} from '@/lib/cad/monte-carlo';

interface ConductorPropertiesProps {
  conductor: Conductor;
}

export function ConductorProperties({ conductor }: ConductorPropertiesProps) {
  const updateConductor = useEditorStore((s) => s.updateConductor);
  const nodes = useEditorStore((s) => s.nodes);
  const cadGeometry = useEditorStore((s) => s.cadGeometry);
  const surfaceNodeMappings = useEditorStore((s) => s.surfaceNodeMappings);
  const { label, display, parse, fmt } = useUnits();
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // ── View factor computation state ──
  const [vfComputing, setVfComputing] = useState(false);
  const [vfProgress, setVfProgress] = useState<ViewFactorProgress | null>(null);
  const [vfResult, setVfResult] = useState<ViewFactorResult | null>(null);
  const [vfQuality, setVfQuality] = useState<RayQuality>('default');
  const [vfError, setVfError] = useState<string | null>(null);
  const [vfCancelFn, setVfCancelFn] = useState<(() => void) | null>(null);

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

  // ── Heat Pipe conductance data helpers ──

  const points: ConductanceDataPoint[] = useMemo(
    () => conductor.conductanceData?.points ?? [
      { temperature: 250, conductance: 50 },
      { temperature: 350, conductance: 50 },
    ],
    [conductor.conductanceData],
  );

  const updatePoints = (newPoints: ConductanceDataPoint[]) => {
    // Sort ascending by temperature
    const sorted = [...newPoints].sort((a, b) => a.temperature - b.temperature);
    updateConductor(conductor.id, {
      conductanceData: { points: sorted },
    });
  };

  const handlePointChange = (index: number, field: 'temperature' | 'conductance', raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    if (field === 'conductance' && val <= 0) return;

    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: val };
    updatePoints(newPoints);
  };

  const addPoint = () => {
    if (points.length >= 20) return;
    const lastT = points[points.length - 1]?.temperature ?? 300;
    updatePoints([...points, { temperature: lastT + 50, conductance: 50 }]);
  };

  const removePoint = (index: number) => {
    if (points.length <= 2) return;
    const newPoints = points.filter((_, i) => i !== index);
    updatePoints(newPoints);
  };

  // Check for duplicate temperatures
  const hasDuplicateTemps = useMemo(() => {
    const temps = points.map((p) => p.temperature);
    return new Set(temps).size !== temps.length;
  }, [points]);

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

      {(conductor.conductorType === 'linear' || conductor.conductorType === 'contact') && (
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

          {/* ── Compute View Factor from Geometry ── */}
          <ViewFactorComputer
            conductor={conductor}
            cadGeometry={cadGeometry}
            surfaceNodeMappings={surfaceNodeMappings}
            vfComputing={vfComputing}
            vfProgress={vfProgress}
            vfResult={vfResult}
            vfQuality={vfQuality}
            vfError={vfError}
            onQualityChange={setVfQuality}
            onCompute={() => {
              if (!cadGeometry) return;
              const surfaces = buildSurfaceData(cadGeometry, surfaceNodeMappings);
              const surfA = surfaces.find((s) => s.nodeId === conductor.nodeFromId);
              const surfB = surfaces.find((s) => s.nodeId === conductor.nodeToId);
              if (!surfA || !surfB) return;

              setVfComputing(true);
              setVfProgress(null);
              setVfResult(null);
              setVfError(null);

              const { promise, cancel } = computeViewFactorAsync(
                surfA,
                surfB,
                surfaces,
                RAY_COUNTS[vfQuality],
                conductor.id,
                (progress) => setVfProgress(progress),
              );

              setVfCancelFn(() => cancel);

              promise
                .then((result) => {
                  setVfResult(result);
                  // Update the conductor's view factor in local store
                  updateConductor(conductor.id, { viewFactor: result.viewFactor });
                  // Persist to DB
                  const pathMatch = window.location.pathname.match(
                    /\/projects\/([^/]+)\/models\/([^/]+)/,
                  );
                  if (pathMatch) {
                    fetch(
                      `/api/projects/${pathMatch[1]}/models/${pathMatch[2]}/view-factors`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          conductorId: conductor.id,
                          viewFactor: result.viewFactor,
                          nRays: result.nRays,
                          duration: result.duration,
                        }),
                      },
                    ).catch(console.error);
                  }
                })
                .catch((err) => setVfError(err.message))
                .finally(() => {
                  setVfComputing(false);
                  setVfCancelFn(null);
                });
            }}
            onCancel={() => {
              vfCancelFn?.();
              setVfComputing(false);
              setVfCancelFn(null);
            }}
          />
        </>
      )}

      {conductor.conductorType === 'heat_pipe' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>G_eff vs Temperature</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addPoint}
              disabled={points.length >= 20}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Point
            </Button>
          </div>

          {hasDuplicateTemps && (
            <p className="text-xs text-red-400">Temperatures must be unique</p>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {points.map((point, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Input
                  type="number"
                  value={point.temperature}
                  onChange={(e) => handlePointChange(idx, 'temperature', e.target.value)}
                  className="bg-white/5 h-7 text-xs"
                  placeholder="T (K)"
                />
                <Input
                  type="number"
                  value={point.conductance}
                  onChange={(e) => handlePointChange(idx, 'conductance', e.target.value)}
                  className="bg-white/5 h-7 text-xs"
                  placeholder="G (W/K)"
                  min="0"
                  step="0.1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePoint(idx)}
                  disabled={points.length <= 2}
                  className="h-7 w-7 p-0"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
            <span>Temperature (K)</span>
            <span>Conductance (W/K)</span>
            <span className="w-7" />
          </div>

          {/* G_eff vs T chart preview */}
          {points.length >= 2 && (
            <div className="h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="temperature"
                    tick={{ fontSize: 10, fill: '#888' }}
                    label={{ value: 'T (K)', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#888' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }}
                    label={{ value: 'G (W/K)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#888' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', fontSize: 11 }}
                    labelFormatter={(v) => `${v} K`}
                    formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)} W/K`, 'G_eff']}
                  />
                  <Line
                    type="linear"
                    dataKey="conductance"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── View Factor Computation Sub-Component ───────────────────────────────────

interface ViewFactorComputerProps {
  conductor: Conductor;
  cadGeometry: import('@/lib/stores/editor-store').CadGeometry | null;
  surfaceNodeMappings: import('@/lib/stores/editor-store').SurfaceNodeMapping[];
  vfComputing: boolean;
  vfProgress: ViewFactorProgress | null;
  vfResult: ViewFactorResult | null;
  vfQuality: RayQuality;
  vfError: string | null;
  onQualityChange: (q: RayQuality) => void;
  onCompute: () => void;
  onCancel: () => void;
}

function ViewFactorComputer({
  conductor,
  cadGeometry,
  surfaceNodeMappings,
  vfComputing,
  vfProgress,
  vfResult,
  vfQuality,
  vfError,
  onQualityChange,
  onCompute,
  onCancel,
}: ViewFactorComputerProps) {
  const hasGeometry = useMemo(() => {
    if (!cadGeometry) return false;
    const surfaces = buildSurfaceData(cadGeometry, surfaceNodeMappings);
    return hasGeometryForConductor(conductor.nodeFromId, conductor.nodeToId, surfaces);
  }, [cadGeometry, surfaceNodeMappings, conductor.nodeFromId, conductor.nodeToId]);

  return (
    <div className="p-3 rounded-lg bg-white/5 space-y-2 mt-2">
      <p className="text-xs font-medium text-muted-foreground">
        Compute from Geometry
      </p>

      {!cadGeometry ? (
        <p className="text-xs text-muted-foreground italic">
          Import CAD geometry and assign surfaces to nodes first
        </p>
      ) : !hasGeometry ? (
        <p className="text-xs text-muted-foreground italic">
          Both connected nodes need surfaces assigned from CAD geometry
        </p>
      ) : (
        <>
          {/* Quality selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Rays:</Label>
            {(['fast', 'default', 'high'] as RayQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                disabled={vfComputing}
                className={`text-xs px-2 py-0.5 rounded ${
                  vfQuality === q
                    ? 'bg-accent-cyan text-black font-medium'
                    : 'bg-white/10 text-muted-foreground hover:bg-white/20'
                }`}
              >
                {q === 'fast' ? '10K' : q === 'default' ? '100K' : '1M'}
              </button>
            ))}
          </div>

          {/* Compute / Cancel button */}
          {vfComputing ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-accent-cyan" />
                <span className="text-xs text-muted-foreground">
                  Computing... {vfProgress?.percent ?? 0}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-6 text-xs text-red-400 ml-auto"
                >
                  Cancel
                </Button>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-cyan transition-all duration-300"
                  style={{ width: `${vfProgress?.percent ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onCompute}
              className="h-7 text-xs gap-1 w-full"
            >
              <Calculator className="h-3 w-3" />
              Compute view factor
            </Button>
          )}

          {/* Result display */}
          {vfResult && !vfComputing && (
            <p className="text-xs text-accent-cyan">
              Computed: {vfResult.viewFactor.toFixed(4)} ({(vfResult.nRays / 1000).toFixed(0)}K rays, {vfResult.duration.toFixed(1)}s)
            </p>
          )}

          {/* Error display */}
          {vfError && !vfComputing && (
            <p className="text-xs text-red-400">{vfError}</p>
          )}
        </>
      )}
    </div>
  );
}
