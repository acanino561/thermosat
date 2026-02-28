'use client';

import { useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { useUnits } from '@/lib/hooks/use-units';
import { useEditorStore } from '@/lib/stores/editor-store';

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4', '#ef4444'];
const COMPARISON_COLORS = ['#86efac', '#93c5fd', '#fdba74', '#d8b4fe', '#67e8f9', '#fca5a5'];

interface HeatFlowChartProps {
  conductorFlows: Record<string, { times: number[]; flows: number[] }>;
  conductorNames: Record<string, string>;
  comparisonConductorFlows?: Record<string, { times: number[]; flows: number[] }> | null;
}

export function HeatFlowChart({
  conductorFlows,
  conductorNames,
  comparisonConductorFlows,
}: HeatFlowChartProps) {
  const { label, display } = useUnits();
  const powerLabel = label('Power');
  const setCurrentTimestep = useEditorStore((s) => s.setCurrentTimestep);

  const condIds = Object.keys(conductorFlows);
  if (condIds.length === 0) return null;

  const timeSteps = conductorFlows[condIds[0]]?.times ?? [];

  const data = useMemo(() => {
    return timeSteps.map((time, i) => {
      const point: Record<string, number> = { time };
      condIds.forEach((condId) => {
        point[condId] = display(conductorFlows[condId].flows[i], 'Power');
      });
      if (comparisonConductorFlows) {
        condIds.forEach((condId) => {
          if (comparisonConductorFlows[condId]) {
            point[`cmp_${condId}`] = display(
              comparisonConductorFlows[condId].flows[i] ?? 0,
              'Power',
            );
          }
        });
      }
      return point;
    });
  }, [timeSteps, condIds, conductorFlows, comparisonConductorFlows, display]);

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
      <h3 className="font-heading text-lg font-semibold mb-4">Heat Flow Through Conductors</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} onMouseMove={handleMouseMove}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
              label={{
                value: `Heat Flow (${powerLabel})`,
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
                const condId = isCmp ? name!.slice(4) : name ?? '';
                const suffix = isCmp ? ' (comparison)' : '';
                return [
                  `${(value ?? 0).toFixed(3)} ${powerLabel}`,
                  (conductorNames[condId] || condId) + suffix,
                ];
              }) as any}
            />
            <Legend
              formatter={(value: string) => {
                const isCmp = value.startsWith('cmp_');
                const condId = isCmp ? value.slice(4) : value;
                return (conductorNames[condId] || condId) + (isCmp ? ' (cmp)' : '');
              }}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />

            {condIds.map((condId, i) => (
              <Line
                key={condId}
                type="monotone"
                dataKey={condId}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}

            {comparisonConductorFlows &&
              condIds.map((condId, i) =>
                comparisonConductorFlows[condId] ? (
                  <Line
                    key={`cmp_${condId}`}
                    type="monotone"
                    dataKey={`cmp_${condId}`}
                    stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                ) : null,
              )}

            <Brush
              dataKey="time"
              height={16}
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
