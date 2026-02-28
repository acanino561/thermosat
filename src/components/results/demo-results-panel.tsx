'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  nodeProfiles,
  conductorFlows,
  simulationTimes,
  eclipsePeriods,
  nodeSummaries,
  energyBalance,
  ORBIT_PERIOD_MIN,
  isInEclipse,
} from '@/lib/demo/simulation-data';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { TemperatureChart as WhatIfTemperatureChart } from '@/components/results/temperature-chart';
import { ResultsTable } from '@/components/results/results-table';
import { OrbitPlayback, OrbitViewToggle } from '@/components/results/orbit-playback';

// ─── Helpers ─────────────────────────────────────────────────────────

function tempToHex(temp: number): string {
  if (temp < 200) return '#0044ff';
  if (temp < 250) return '#00ccff';
  if (temp < 300) return '#00ff66';
  if (temp < 350) return '#ffcc00';
  return '#ff3300';
}

// ─── Temperature Chart ───────────────────────────────────────────────

function TemperatureChart() {
  const currentTime = useTimelineStore((s) => s.currentTime);

  // Downsample for chart rendering (every 10th point)
  const chartData = useMemo(() => {
    const step = 10;
    const data: Record<string, number>[] = [];
    for (let i = 0; i < simulationTimes.length; i += step) {
      const point: Record<string, number> = { time: simulationTimes[i] };
      nodeProfiles.forEach((np) => {
        point[np.name] = Math.round(np.temperatures[i] * 10) / 10;
      });
      data.push(point);
    }
    return data;
  }, []);

  return (
    <div className="h-[260px] w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase">
          Temperature vs Time
        </h3>
        <span className="text-[9px] font-mono text-slate-600">
          3 orbits · 277 min
        </span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          {/* Eclipse shading */}
          {eclipsePeriods.map((ep, i) => (
            <ReferenceArea
              key={i}
              x1={ep.start}
              x2={ep.end}
              fill="rgba(99,102,241,0.08)"
              strokeOpacity={0}
            />
          ))}
          {/* Orbit dividers */}
          <ReferenceLine x={ORBIT_PERIOD_MIN} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <ReferenceLine x={ORBIT_PERIOD_MIN * 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          {/* Current time cursor */}
          <ReferenceLine
            x={currentTime}
            stroke="#00e5ff"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, 277]}
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
            tickFormatter={(v: number) => `${Math.round(v)}m`}
            stroke="rgba(255,255,255,0.06)"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
            tickFormatter={(v: number) => `${v}K`}
            stroke="rgba(255,255,255,0.06)"
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(5,10,20,0.95)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '6px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#e2e8f0',
            }}
            labelFormatter={(v) => `t = ${Number(v).toFixed(1)} min`}
            formatter={((value: any, name: any) => [`${Number(value).toFixed(1)}K`, name]) as any}
          />
          {nodeProfiles.filter(p => p.name !== 'Deep Space').map((np) => (
            <Line
              key={np.name}
              type="monotone"
              dataKey={np.name}
              stroke={np.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Heat Flow Chart ─────────────────────────────────────────────────

function HeatFlowChart() {
  const currentTime = useTimelineStore((s) => s.currentTime);

  const chartData = useMemo(() => {
    const step = 10;
    const data: Record<string, number>[] = [];
    for (let i = 0; i < simulationTimes.length; i += step) {
      const point: Record<string, number> = { time: simulationTimes[i] };
      conductorFlows.forEach((cf) => {
        point[cf.name] = Math.round(cf.flows[i] * 100) / 100;
      });
      data.push(point);
    }
    return data;
  }, []);

  return (
    <div className="h-[220px] w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase">
          Conductor Heat Flows
        </h3>
        <span className="text-[9px] font-mono text-slate-600">Watts</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          {eclipsePeriods.map((ep, i) => (
            <ReferenceArea
              key={i}
              x1={ep.start}
              x2={ep.end}
              fill="rgba(99,102,241,0.06)"
              strokeOpacity={0}
            />
          ))}
          <ReferenceLine
            x={currentTime}
            stroke="#00e5ff"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, 277]}
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
            tickFormatter={(v: number) => `${Math.round(v)}m`}
            stroke="rgba(255,255,255,0.06)"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
            tickFormatter={(v: number) => `${v}W`}
            stroke="rgba(255,255,255,0.06)"
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(5,10,20,0.95)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '6px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#e2e8f0',
            }}
            labelFormatter={(v) => `t = ${Number(v).toFixed(1)} min`}
            formatter={((value: any, name: any) => [`${Number(value).toFixed(3)}W`, name]) as any}
          />
          {conductorFlows.map((cf) => (
            <Line
              key={cf.name}
              type="monotone"
              dataKey={cf.name}
              stroke={cf.color}
              strokeWidth={1.2}
              dot={false}
              activeDot={{ r: 2.5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Summary Table ───────────────────────────────────────────────────

function SummaryTable() {
  return (
    <div>
      <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase mb-2 px-1">
        Node Summary
      </h3>
      <div
        className="rounded-md overflow-hidden"
        style={{
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-6 gap-0 px-3 py-1.5 text-[9px] font-mono text-slate-500 tracking-wide"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="col-span-2">NODE</div>
          <div className="text-right">MIN</div>
          <div className="text-right">MAX</div>
          <div className="text-right">AVG</div>
          <div className="text-right">ΔT</div>
        </div>
        {/* Rows */}
        {nodeSummaries.map((s, i) => (
          <div
            key={s.name}
            className={cn(
              'grid grid-cols-6 gap-0 px-3 py-1.5 text-[10px] font-mono transition-colors',
              s.exceedsLimits ? 'bg-red-500/5' : '',
              i % 2 === 0 ? 'bg-white/[0.01]' : '',
            )}
            style={{
              borderTop: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <div className="col-span-2 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: nodeProfiles[i]?.color ?? '#666' }}
              />
              <span className={cn(
                'text-slate-300 truncate',
                s.exceedsLimits && 'text-red-400',
              )}>
                {s.name}
              </span>
              {s.exceedsLimits && (
                <span className="text-[8px] text-red-400" title={s.limitViolation ?? ''}>⚠</span>
              )}
            </div>
            <div className="text-right tabular-nums" style={{ color: tempToHex(s.min) }}>
              {s.min.toFixed(0)}K
            </div>
            <div className="text-right tabular-nums" style={{ color: tempToHex(s.max) }}>
              {s.max.toFixed(0)}K
            </div>
            <div className="text-right tabular-nums text-slate-400">
              {s.avg.toFixed(0)}K
            </div>
            <div className="text-right tabular-nums text-slate-500">
              {s.swing.toFixed(0)}K
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Energy Balance ──────────────────────────────────────────────────

function EnergyBalanceIndicator() {
  const total = Math.max(energyBalance.totalEnergyIn, energyBalance.totalEnergyRadiated, 1);
  const inFrac = energyBalance.totalEnergyIn / total;
  const radFrac = energyBalance.totalEnergyRadiated / total;

  const formatEnergy = (j: number) => {
    if (Math.abs(j) > 1e6) return `${(j / 1e6).toFixed(1)} MJ`;
    if (Math.abs(j) > 1e3) return `${(j / 1e3).toFixed(1)} kJ`;
    return `${j.toFixed(0)} J`;
  };

  return (
    <div>
      <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase mb-2 px-1">
        Energy Balance
      </h3>
      <div
        className="rounded-md p-3"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Visual balance bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1">
              <span className="text-emerald-400">Energy In</span>
              <span className="text-emerald-400/70">{formatEnergy(energyBalance.totalEnergyIn)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${inFrac * 100}%`,
                  background: 'linear-gradient(90deg, #10b981, #34d399)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1">
              <span className="text-orange-400">Radiated Out</span>
              <span className="text-orange-400/70">{formatEnergy(energyBalance.totalEnergyRadiated)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${radFrac * 100}%`,
                  background: 'linear-gradient(90deg, #f97316, #fb923c)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1">
              <span className="text-cyan-400">Stored (ΔE)</span>
              <span className="text-cyan-400/70">{formatEnergy(energyBalance.totalEnergyStored)}</span>
            </div>
          </div>
        </div>

        {/* Error indicator */}
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">Balance Error</span>
            <span
              className={cn(
                'text-[10px] font-mono font-medium',
                energyBalance.balanceError < 1 ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {energyBalance.balanceError.toFixed(2)}%
              {energyBalance.balanceError < 1 && ' ✓'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orbit Indicator ─────────────────────────────────────────────────

function OrbitIndicator() {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const eclipse = isInEclipse(currentTime);
  const phase = ((currentTime % ORBIT_PERIOD_MIN) / ORBIT_PERIOD_MIN * 360);

  return (
    <div>
      <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase mb-2 px-1">
        Orbit Position
      </h3>
      <div
        className="rounded-md p-3 flex items-center gap-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Orbit circle */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full">
            {/* Orbit ring */}
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            {/* Eclipse arc */}
            <path
              d={describeArc(32, 32, 26, 360 * (1 - 0.35), 360)}
              fill="none"
              stroke="rgba(99,102,241,0.3)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Sunlit arc */}
            <path
              d={describeArc(32, 32, 26, 0, 360 * (1 - 0.35))}
              fill="none"
              stroke="rgba(0,229,255,0.2)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Current position dot */}
            <circle
              cx={32 + 26 * Math.cos((phase - 90) * Math.PI / 180)}
              cy={32 + 26 * Math.sin((phase - 90) * Math.PI / 180)}
              r="3"
              fill={eclipse ? '#6366f1' : '#00e5ff'}
            />
            {/* Earth center */}
            <circle cx="32" cy="32" r="4" fill="#1a5276" />
          </svg>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: eclipse ? '#6366f1' : '#00e5ff' }}
            />
            <span className="text-[10px] font-mono text-slate-300">
              {eclipse ? 'In Eclipse' : 'Sunlit'}
            </span>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            Phase: {phase.toFixed(0)}° · Alt: 400 km
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            Inc: 51.6° · Period: 92.4 min
          </div>
        </div>
      </div>
    </div>
  );
}

function describeArc(x: number, y: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, r, endAngle - 90);
  const end = polarToCartesian(x, y, r, startAngle - 90);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = angle * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Thermal Legend ──────────────────────────────────────────────────

function ThermalLegend() {
  return (
    <div>
      <h3 className="text-[11px] font-mono text-slate-400 tracking-wider uppercase mb-2 px-1">
        Thermal Colormap
      </h3>
      <div className="flex items-center gap-0 h-3 rounded-sm overflow-hidden mx-1">
        <div className="flex-1 h-full" style={{ background: '#0044ff' }} />
        <div className="flex-1 h-full" style={{ background: '#00ccff' }} />
        <div className="flex-1 h-full" style={{ background: '#00ff66' }} />
        <div className="flex-1 h-full" style={{ background: '#ffcc00' }} />
        <div className="flex-1 h-full" style={{ background: '#ff3300' }} />
      </div>
      <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-0.5 mx-1">
        <span>&lt;200K</span>
        <span>250K</span>
        <span>300K</span>
        <span>350K</span>
        <span>&gt;400K</span>
      </div>
    </div>
  );
}

// ─── Main Results Panel ──────────────────────────────────────────────

export function DemoResultsPanel() {
  const simulationResults = useEditorStore((s) => s.simulationResults);
  const nodes = useEditorStore((s) => s.nodes);
  const whatIfSensitivityEntries = useEditorStore((s) => s.whatIfSensitivityEntries);
  const comparisonResults = useEditorStore((s) => s.comparisonResults);
  const [showOrbitView, setShowOrbitView] = useState(false);

  // Build nodeResults and nodeNames from store simulation results
  const storeNodeResults = useMemo(() => {
    if (!simulationResults) return null;
    return simulationResults.nodeResults;
  }, [simulationResults]);

  const storeNodeNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const node of nodes) {
      names[node.id] = node.name;
    }
    return names;
  }, [nodes]);

  const comparisonNodeResults = useMemo(() => {
    if (!comparisonResults) return null;
    return comparisonResults.nodeResults;
  }, [comparisonResults]);

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar"
      style={{ background: '#030810' }}
    >
      <div className="p-4 space-y-5">
        {/* Header */}
        <div
          className="rounded-md p-3"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.05), rgba(99,102,241,0.05))',
            border: '1px solid rgba(0,229,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-mono text-cyan-400 font-medium">
                Simulation Complete
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                6U CubeSat · 400km LEO · 3 orbits · 277 min
              </div>
            </div>
            <OrbitViewToggle
              isActive={showOrbitView}
              onToggle={() => setShowOrbitView(!showOrbitView)}
            />
          </div>
        </div>

        {/* Orbit Playback View */}
        {showOrbitView && (
          <div className="rounded-md overflow-hidden" style={{ height: '360px', border: '1px solid rgba(0,229,255,0.1)' }}>
            <OrbitPlayback />
          </div>
        )}

        {/* What-If Temperature Chart (from store data) */}
        {storeNodeResults && (
          <WhatIfTemperatureChart
            nodeResults={storeNodeResults}
            nodeNames={storeNodeNames}
            comparisonNodeResults={comparisonNodeResults}
            sensitivityEntries={whatIfSensitivityEntries.length > 0 ? whatIfSensitivityEntries : undefined}
          />
        )}

        {/* What-If Results Table (from store data) */}
        {storeNodeResults && (
          <ResultsTable
            nodeResults={storeNodeResults}
            nodeNames={storeNodeNames}
            comparisonNodeResults={comparisonNodeResults}
            sensitivityEntries={whatIfSensitivityEntries.length > 0 ? whatIfSensitivityEntries : undefined}
          />
        )}

        {/* Temperature chart */}
        <TemperatureChart />

        {/* Heat flow chart */}
        <HeatFlowChart />

        {/* Summary table */}
        <SummaryTable />

        {/* Orbit indicator + Energy balance side by side */}
        <div className="grid grid-cols-1 gap-4">
          <OrbitIndicator />
          <EnergyBalanceIndicator />
        </div>

        {/* Thermal legend */}
        <ThermalLegend />
      </div>
    </div>
  );
}
