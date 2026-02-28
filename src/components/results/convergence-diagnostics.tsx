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
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ConvergenceDiagnosticsProps {
  /** Iteration count per timestep */
  iterationHistory?: number[];
  /** Adaptive time step sizes (seconds) */
  timeStepHistory?: number[];
  /** Time points corresponding to the histories */
  timePoints?: number[];
  /** Energy balance: total energy in (J) */
  energyIn?: number;
  /** Energy balance: total energy out (J) */
  energyOut?: number;
  /** Energy balance: total energy stored (J) */
  energyStored?: number;
  /** Overall energy balance error fraction */
  energyBalanceError?: number;
  /** Whether the simulation converged */
  converged?: boolean;
}

export function ConvergenceDiagnostics({
  iterationHistory = [],
  timeStepHistory = [],
  timePoints = [],
  energyIn,
  energyOut,
  energyStored,
  energyBalanceError,
  converged,
}: ConvergenceDiagnosticsProps) {
  const iterData = useMemo(() => {
    return timePoints.map((t, i) => ({
      time: t,
      iterations: iterationHistory[i] ?? 0,
      timeStep: timeStepHistory[i] ?? 0,
    }));
  }, [timePoints, iterationHistory, timeStepHistory]);

  const errorPercent = energyBalanceError != null ? energyBalanceError * 100 : null;
  const isAcceptable = errorPercent != null && Math.abs(errorPercent) < 1;

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <h3 className="font-heading text-lg font-semibold">Convergence Diagnostics</h3>

      {/* Convergence status */}
      <div className="flex items-center gap-3">
        {converged ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : converged === false ? (
          <XCircle className="h-5 w-5 text-red-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        )}
        <span className="font-medium">
          {converged ? 'Converged' : converged === false ? 'Did Not Converge' : 'Unknown'}
        </span>
        {errorPercent != null && (
          <Badge variant={isAcceptable ? 'cyan' : 'orange'}>
            Energy error: {errorPercent.toFixed(4)}%
          </Badge>
        )}
      </div>

      {/* Energy balance summary */}
      {(energyIn != null || energyOut != null || energyStored != null) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Energy In', value: energyIn, color: 'text-green-400' },
            { label: 'Energy Out', value: energyOut, color: 'text-red-400' },
            { label: 'Energy Stored', value: energyStored, color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`font-mono text-sm ${color}`}>
                {value != null ? `${value.toExponential(3)} J` : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Iteration count history chart */}
      {iterData.length > 0 && iterationHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Iterations per Timestep</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={iterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  stroke="rgba(255,255,255,0.1)"
                  label={{ value: 'Iterations', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111122',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: 11,
                  }}
                  labelFormatter={(l: any) => `t = ${(Number(l) / 60).toFixed(1)} min`}
                />
                <Line type="stepAfter" dataKey="iterations" stroke="#f97316" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Time step size history chart */}
      {iterData.length > 0 && timeStepHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Adaptive Time Step Size</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={iterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v / 60).toFixed(0)}m`}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  stroke="rgba(255,255,255,0.1)"
                  label={{ value: 'Δt (s)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111122',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: 11,
                  }}
                  labelFormatter={(l: any) => `t = ${(Number(l) / 60).toFixed(1)} min`}
                />
                <Line type="stepAfter" dataKey="timeStep" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
