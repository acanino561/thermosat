'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import type {
  ExplorationSampleResult,
  ExplorationParameter,
} from '@/lib/solver/design-space';

interface DesignSpaceChartProps {
  results: ExplorationSampleResult[];
  parameters: ExplorationParameter[];
}

function paramKey(p: ExplorationParameter): string {
  return `${p.entityType}_${p.entityId}_${p.property}`;
}

function paramLabel(p: ExplorationParameter): string {
  return `${p.entityType} · ${p.property}`;
}

interface ChartDatum {
  x: number;
  y: number;
  feasible: boolean;
  sample: ExplorationSampleResult;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, parameters: params }: any) {
  if (!active || !payload?.[0]) return null;
  const datum: ChartDatum = payload[0].payload;
  const { sample } = datum;
  return (
    <div className="rounded-lg border border-white/10 bg-space-surface p-3 text-xs shadow-lg space-y-1">
      {params.map((p: ExplorationParameter) => (
        <div key={paramKey(p)} className="flex justify-between gap-4">
          <span className="text-white/50">{paramLabel(p)}</span>
          <span className="font-mono">{sample.paramValues[paramKey(p)]?.toPrecision(3)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-white/10 pt-1 mt-1">
        <span className="text-white/50">Max Temp</span>
        <span className="font-mono">{datum.y.toFixed(1)} K</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-white/50">Feasible</span>
        <span>{sample.feasible ? '✅ Yes' : '❌ No'}</span>
      </div>
    </div>
  );
}

export function DesignSpaceChart({ results, parameters }: DesignSpaceChartProps) {
  const [xParamIdx, setXParamIdx] = useState('0');
  const [yParamIdx, setYParamIdx] = useState(parameters.length > 1 ? '1' : '0');

  const chartData = useMemo(() => {
    const xParam = parameters[parseInt(xParamIdx)];
    if (!xParam) return { feasible: [], infeasible: [] };

    const feasible: ChartDatum[] = [];
    const infeasible: ChartDatum[] = [];

    for (const sample of results) {
      const xVal = sample.paramValues[paramKey(xParam)] ?? 0;
      const maxTemp = sample.nodeResults.length > 0
        ? Math.max(...sample.nodeResults.map((nr) => nr.maxTemp))
        : 0;
      const datum: ChartDatum = { x: xVal, y: maxTemp, feasible: sample.feasible, sample };
      if (sample.feasible) feasible.push(datum);
      else infeasible.push(datum);
    }

    return { feasible, infeasible };
  }, [results, parameters, xParamIdx]);

  const feasibleCount = results.filter((r) => r.feasible).length;

  const downloadCsv = useCallback(() => {
    const headers = ['sampleIndex', ...parameters.map(paramLabel), 'maxTemp', 'feasible'];
    const rows = results.map((s) => {
      const maxTemp = s.nodeResults.length > 0
        ? Math.max(...s.nodeResults.map((nr) => nr.maxTemp))
        : 0;
      return [
        s.sampleIndex,
        ...parameters.map((p) => s.paramValues[paramKey(p)] ?? ''),
        maxTemp,
        s.feasible,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-space-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [results, parameters]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-white/60">X-axis</Label>
          <Select value={xParamIdx} onValueChange={setXParamIdx}>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {parameters.map((p, i) => (
                <SelectItem key={i} value={String(i)}>{paramLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-white/60">Y-axis (Max Temp)</Label>
          <Select value={yParamIdx} onValueChange={setYParamIdx} disabled>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder="Max Temp (K)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Max Temp (K)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="x"
              type="number"
              name={paramLabel(parameters[parseInt(xParamIdx)])}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              dataKey="y"
              type="number"
              name="Max Temp (K)"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              stroke="rgba(255,255,255,0.1)"
            />
            <Tooltip content={<CustomTooltip parameters={parameters} />} />
            <Scatter name="Feasible" data={chartData.feasible} fill="#22c55e" fillOpacity={0.8} />
            <Scatter name="Infeasible" data={chartData.infeasible} fill="#ef4444" fillOpacity={0.8} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          <span className="text-green-400 font-medium">{feasibleCount}</span> feasible of{' '}
          <span className="font-medium">{results.length}</span> total samples
        </p>
        <Button variant="ghost" size="sm" className="text-xs text-white/50 gap-1" onClick={downloadCsv}>
          <Download className="h-3 w-3" /> Download CSV
        </Button>
      </div>
    </div>
  );
}
