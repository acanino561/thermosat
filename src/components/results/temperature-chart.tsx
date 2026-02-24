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

const COLORS = ['#3b82f6', '#06b6d4', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#ec4899'];

interface TemperatureChartProps {
  nodeResults: Record<string, { times: number[]; temperatures: number[] }>;
  nodeNames: Record<string, string>;
}

export function TemperatureChart({ nodeResults, nodeNames }: TemperatureChartProps) {
  // Transform data for Recharts
  const nodeIds = Object.keys(nodeResults);
  if (nodeIds.length === 0) return null;

  const timeSteps = nodeResults[nodeIds[0]]?.times ?? [];
  const data = timeSteps.map((time, i) => {
    const point: Record<string, number> = { time };
    nodeIds.forEach((nodeId) => {
      point[nodeId] = nodeResults[nodeId].temperatures[i];
    });
    return point;
  });

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Temperature vs Time</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
              label={{ value: 'Temperature (K)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 12 }}
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
                `${(value ?? 0).toFixed(2)} K`,
                nodeNames[name ?? ''] || name || '',
              ]) as any}
              labelFormatter={((label: any) => `t = ${(Number(label) / 60).toFixed(1)} min`) as any}
            />
            <Legend
              formatter={(value: string) => nodeNames[value] || value}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
