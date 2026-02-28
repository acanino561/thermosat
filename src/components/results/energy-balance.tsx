'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ConvergenceDiagnosticsData {
  iterationsPerStep?: { time: number; iterations: number }[];
  timeStepHistory?: { time: number; dt: number }[];
  cumulativeEnergyBalance?: { time: number; energyIn: number; energyOut: number; stored: number; error: number }[];
}

interface EnergyBalanceProps {
  error?: number;
  convergenceDiagnostics?: ConvergenceDiagnosticsData;
}

const tooltipStyle = {
  backgroundColor: '#111122',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: 11,
};

const axisTickStyle = { fill: '#94a3b8', fontSize: 10 };

function formatEnergy(j: number) {
  if (Math.abs(j) > 1e6) return `${(j / 1e6).toFixed(1)} MJ`;
  if (Math.abs(j) > 1e3) return `${(j / 1e3).toFixed(1)} kJ`;
  return `${j.toFixed(0)} J`;
}

export function EnergyBalance({ error, convergenceDiagnostics }: EnergyBalanceProps) {
  const errorPercent = error != null ? error * 100 : null;
  const isAcceptable = errorPercent != null && Math.abs(errorPercent) < 1;

  // Downsample diagnostics for chart rendering
  const iterData = useMemo(() => {
    const raw = convergenceDiagnostics?.iterationsPerStep;
    if (!raw?.length) return null;
    const step = Math.max(1, Math.floor(raw.length / 100));
    return raw.filter((_, i) => i % step === 0);
  }, [convergenceDiagnostics?.iterationsPerStep]);

  const dtData = useMemo(() => {
    const raw = convergenceDiagnostics?.timeStepHistory;
    if (!raw?.length) return null;
    const step = Math.max(1, Math.floor(raw.length / 100));
    return raw.filter((_, i) => i % step === 0);
  }, [convergenceDiagnostics?.timeStepHistory]);

  const energyData = useMemo(() => {
    const raw = convergenceDiagnostics?.cumulativeEnergyBalance;
    if (!raw?.length) return null;
    const step = Math.max(1, Math.floor(raw.length / 80));
    return raw.filter((_, i) => i % step === 0).map((d) => ({
      ...d,
      energyIn: d.energyIn / 1000, // kJ
      energyOut: d.energyOut / 1000,
      stored: d.stored / 1000,
    }));
  }, [convergenceDiagnostics?.cumulativeEnergyBalance]);

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      {/* Summary badge */}
      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Energy Balance & Convergence</h3>
        <div className="flex items-center gap-4">
          {isAcceptable ? (
            <div className="p-3 rounded-lg bg-green-400/10">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-yellow-400/10">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-lg">
                {errorPercent != null ? `${errorPercent.toFixed(4)}%` : 'N/A'}
              </span>
              <Badge variant={isAcceptable ? 'cyan' : 'orange'}>
                {isAcceptable ? 'Pass' : 'Warning'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAcceptable
                ? 'Energy balance error is within acceptable limits (< 1%).'
                : 'Energy balance error exceeds 1%. Consider using a smaller time step.'}
            </p>
          </div>
        </div>
      </div>

      {/* Iteration history chart */}
      {iterData && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Iterations per Timestep</h4>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={iterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={axisTickStyle}
                  tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis tick={axisTickStyle} stroke="rgba(255,255,255,0.1)" allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => `t = ${(Number(v)).toFixed(1)} min`}
                  formatter={((v: number) => [`${v} iterations`, 'Iterations']) as any}
                />
                <Bar dataKey="iterations" fill="#6366f1" radius={[1, 1, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Timestep history chart */}
      {dtData && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Adaptive Timestep History</h4>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={axisTickStyle}
                  tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  tick={axisTickStyle}
                  stroke="rgba(255,255,255,0.1)"
                  label={{ value: 'Δt (min)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => `t = ${(Number(v)).toFixed(1)} min`}
                  formatter={((v: number) => [`${v.toFixed(3)} min`, 'Δt']) as any}
                />
                <Line type="stepAfter" dataKey="dt" stroke="#22c55e" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cumulative energy balance chart */}
      {energyData && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Cumulative Energy Balance</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={axisTickStyle}
                  tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  tick={axisTickStyle}
                  stroke="rgba(255,255,255,0.1)"
                  label={{ value: 'Energy (kJ)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => `t = ${(Number(v)).toFixed(1)} min`}
                  formatter={((v: number, name: string) => [`${v.toFixed(1)} kJ`, name]) as any}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                <Line type="monotone" dataKey="energyIn" name="Energy In" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="energyOut" name="Radiated Out" stroke="#f97316" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="stored" name="Stored (ΔE)" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
