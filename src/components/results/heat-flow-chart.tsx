'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4', '#ef4444'];

interface HeatFlowChartProps {
  conductorFlows: Record<string, { times: number[]; flows: number[] }>;
  conductorNames: Record<string, string>;
}

export function HeatFlowChart({ conductorFlows, conductorNames }: HeatFlowChartProps) {
  const condIds = Object.keys(conductorFlows);
  if (condIds.length === 0) return null;

  const timeSteps = conductorFlows[condIds[0]]?.times ?? [];
  const data = timeSteps.map((time, i) => {
    const point: Record<string, number> = { time };
    condIds.forEach((condId) => {
      point[condId] = conductorFlows[condId].flows[i];
    });
    return point;
  });

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Heat Flow Through Conductors</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
              label={{ value: 'Heat Flow (W)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111122',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={((value: number | undefined, name: string | undefined) => [
                `${(value ?? 0).toFixed(3)} W`,
                conductorNames[name ?? ''] || name || '',
              ]) as any}
            />
            <Legend
              formatter={(value: string) => conductorNames[value] || value}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
