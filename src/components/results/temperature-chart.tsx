'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Brush,
} from 'recharts';
import { useUnits } from '@/lib/hooks/use-units';
import { useEditorStore } from '@/lib/stores/editor-store';
import { computeWhatIfTemps, type SensitivityEntry } from '@/lib/what-if/sensitivity-calc';

const COLORS = ['#3b82f6', '#06b6d4', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#ec4899'];
const COMPARISON_COLORS = ['#93c5fd', '#67e8f9', '#fdba74', '#86efac', '#d8b4fe', '#fca5a5', '#fde047', '#f9a8d4'];
const WHATIF_COLOR = '#f59e0b'; // amber for What If traces

interface EclipsePeriod {
  start: number; // seconds
  end: number;
}

interface TemperatureChartProps {
  nodeResults: Record<string, { times: number[]; temperatures: number[] }>;
  nodeNames: Record<string, string>;
  eclipsePeriods?: EclipsePeriod[];
  comparisonNodeResults?: Record<string, { times: number[]; temperatures: number[] }> | null;
  sensitivityEntries?: SensitivityEntry[];
}

export function TemperatureChart({
  nodeResults,
  nodeNames,
  eclipsePeriods = [],
  comparisonNodeResults,
  sensitivityEntries,
}: TemperatureChartProps) {
  const { label, display } = useUnits();
  const tempLabel = label('Temperature');
  const setCurrentTimestep = useEditorStore((s) => s.setCurrentTimestep);
  const nodeLimits = useEditorStore((s) => s.nodeLimits);
  const whatIfEnabled = useEditorStore((s) => s.whatIfEnabled);
  const whatIfDeltas = useEditorStore((s) => s.whatIfDeltas);

  const nodeIds = Object.keys(nodeResults);
  if (nodeIds.length === 0) return null;

  const timeSteps = nodeResults[nodeIds[0]]?.times ?? [];

  const data = useMemo(() => {
    return timeSteps.map((time, i) => {
      const point: Record<string, number> = { time, _index: i };
      nodeIds.forEach((nodeId) => {
        point[nodeId] = display(nodeResults[nodeId].temperatures[i], 'Temperature');
      });
      if (comparisonNodeResults) {
        nodeIds.forEach((nodeId) => {
          if (comparisonNodeResults[nodeId]) {
            point[`cmp_${nodeId}`] = display(
              comparisonNodeResults[nodeId].temperatures[i] ?? 0,
              'Temperature',
            );
          }
        });
      }
      return point;
    });
  }, [timeSteps, nodeIds, nodeResults, comparisonNodeResults, display]);

  // Compute What-If temperatures (last timestep + ΔT)
  const whatIfActive = whatIfEnabled && sensitivityEntries && sensitivityEntries.length > 0
    && Object.values(whatIfDeltas).some((d) => Math.abs(d) > 1e-12);

  const whatIfFinalTemps = useMemo(() => {
    if (!whatIfActive || !sensitivityEntries) return null;
    // Build baseline from last timestep
    const baseline: Record<string, number> = {};
    nodeIds.forEach((nodeId) => {
      const temps = nodeResults[nodeId]?.temperatures;
      if (temps && temps.length > 0) {
        baseline[nodeId] = temps[temps.length - 1];
      }
    });
    return computeWhatIfTemps(baseline, sensitivityEntries, whatIfDeltas);
  }, [whatIfActive, sensitivityEntries, whatIfDeltas, nodeIds, nodeResults]);

  // Collect unique limit lines
  const limitLines = useMemo(() => {
    const lines: { value: number; label: string }[] = [];
    Object.entries(nodeLimits).forEach(([nodeId, lim]) => {
      if (lim.minTemp != null) {
        const v = display(lim.minTemp, 'Temperature');
        if (!lines.some((l) => Math.abs(l.value - v) < 0.01))
          lines.push({ value: v, label: `Min (${nodeNames[nodeId] || nodeId})` });
      }
      if (lim.maxTemp != null) {
        const v = display(lim.maxTemp, 'Temperature');
        if (!lines.some((l) => Math.abs(l.value - v) < 0.01))
          lines.push({ value: v, label: `Max (${nodeNames[nodeId] || nodeId})` });
      }
    });
    return lines;
  }, [nodeLimits, nodeNames, display]);

  const handleMouseMove = useCallback(
    (state: any) => {
      if (state?.activeTooltipIndex != null) {
        setCurrentTimestep(state.activeTooltipIndex);
      }
    },
    [setCurrentTimestep],
  );

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Temperature vs Time</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} onMouseMove={handleMouseMove}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

            {/* Eclipse band shading */}
            {eclipsePeriods.map((ep, i) => (
              <ReferenceArea
                key={`eclipse-${i}`}
                x1={ep.start}
                x2={ep.end}
                fill="rgba(100,100,120,0.15)"
                fillOpacity={1}
                strokeOpacity={0}
              />
            ))}

            {/* Temperature limit lines */}
            {limitLines.map((ll, i) => (
              <ReferenceLine
                key={`limit-${i}`}
                y={ll.value}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{
                  value: ll.label,
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 9,
                }}
              />
            ))}

            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
              stroke="rgba(255,255,255,0.1)"
              label={{ value: 'Time', position: 'bottom', fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
              label={{
                value: `Temperature (${tempLabel})`,
                angle: -90,
                position: 'left',
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111122',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={((value: number | undefined, name: string | undefined) => {
                const isCmp = name?.startsWith('cmp_');
                const nodeId = isCmp ? name!.slice(4) : name ?? '';
                const suffix = isCmp ? ' (comparison)' : '';
                return [`${(value ?? 0).toFixed(2)} ${tempLabel}`, (nodeNames[nodeId] || nodeId) + suffix];
              }) as any}
              labelFormatter={((l: any) => `t = ${(Number(l) / 60).toFixed(1)} min`) as any}
            />
            <Legend
              formatter={(value: string) => {
                const isCmp = value.startsWith('cmp_');
                const nodeId = isCmp ? value.slice(4) : value;
                return (nodeNames[nodeId] || nodeId) + (isCmp ? ' (cmp)' : '');
              }}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />

            {/* Primary traces */}
            {nodeIds.map((nodeId, i) => (
              <Line
                key={nodeId}
                type="monotone"
                dataKey={nodeId}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}

            {/* Comparison traces */}
            {comparisonNodeResults &&
              nodeIds.map((nodeId, i) =>
                comparisonNodeResults[nodeId] ? (
                  <Line
                    key={`cmp_${nodeId}`}
                    type="monotone"
                    dataKey={`cmp_${nodeId}`}
                    stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                ) : null,
              )}

            {/* What If prediction lines (dashed amber) */}
            {whatIfFinalTemps &&
              nodeIds.map((nodeId) => {
                const temp = whatIfFinalTemps[nodeId];
                if (temp == null) return null;
                const displayed = display(temp, 'Temperature');
                return (
                  <ReferenceLine
                    key={`wi_${nodeId}`}
                    y={displayed}
                    stroke={WHATIF_COLOR}
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    label={{
                      value: `WI: ${nodeNames[nodeId] || nodeId}`,
                      position: 'right',
                      fill: WHATIF_COLOR,
                      fontSize: 9,
                    }}
                  />
                );
              })}

            {/* Zoom/pan via Brush */}
            <Brush
              dataKey="time"
              height={20}
              stroke="#00e5ff"
              fill="rgba(0,0,0,0.3)"
              tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
