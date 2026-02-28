'use client';

import { useMemo } from 'react';
import { useUnits } from '@/lib/hooks/use-units';
import { useEditorStore } from '@/lib/stores/editor-store';
import { computeDeltaTs, type SensitivityEntry } from '@/lib/what-if/sensitivity-calc';

interface ResultsTableProps {
  nodeResults: Record<string, { times: number[]; temperatures: number[] }>;
  nodeNames: Record<string, string>;
  comparisonNodeResults?: Record<string, { times: number[]; temperatures: number[] }> | null;
  sensitivityEntries?: SensitivityEntry[];
}

type Status = 'pass' | 'warning' | 'fail';

function getStatus(
  temp: number,
  limits: { minTemp: number; maxTemp: number } | undefined,
): Status {
  if (!limits) return 'pass';
  const { minTemp, maxTemp } = limits;
  const range = maxTemp - minTemp;
  const margin = range * 0.1;
  if (temp < minTemp || temp > maxTemp) return 'fail';
  if (temp < minTemp + margin || temp > maxTemp - margin) return 'warning';
  return 'pass';
}

function worstStatus(statuses: Status[]): Status {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warning')) return 'warning';
  return 'pass';
}

const STATUS_ICON: Record<Status, string> = {
  pass: '✅',
  warning: '⚠️',
  fail: '❌',
};

export function ResultsTable({ nodeResults, nodeNames, comparisonNodeResults, sensitivityEntries }: ResultsTableProps) {
  const { label, display } = useUnits();
  const tempLabel = label('Temperature');
  const nodeLimits = useEditorStore((s) => s.nodeLimits);
  const whatIfEnabled = useEditorStore((s) => s.whatIfEnabled);
  const whatIfDeltas = useEditorStore((s) => s.whatIfDeltas);

  const whatIfDeltaTs = useMemo(() => {
    if (!whatIfEnabled || !sensitivityEntries || sensitivityEntries.length === 0) return null;
    if (!Object.values(whatIfDeltas).some((d) => Math.abs(d) > 1e-12)) return null;
    return computeDeltaTs(sensitivityEntries, whatIfDeltas);
  }, [whatIfEnabled, sensitivityEntries, whatIfDeltas]);

  const rows = useMemo(() => {
    return Object.entries(nodeResults).map(([nodeId, data]) => {
      const temps = data.temperatures;
      const min = Math.min(...temps);
      const max = Math.max(...temps);
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      const initial = temps[0];
      const final = temps[temps.length - 1];

      const limits = nodeLimits[nodeId];
      const minStatus = getStatus(min, limits);
      const maxStatus = getStatus(max, limits);
      const overall = worstStatus([minStatus, maxStatus]);

      // Comparison delta
      let compDelta: number | null = null;
      if (comparisonNodeResults?.[nodeId]) {
        const cmpTemps = comparisonNodeResults[nodeId].temperatures;
        const cmpFinal = cmpTemps[cmpTemps.length - 1];
        compDelta = display(final, 'Temperature') - display(cmpFinal, 'Temperature');
      }

      return {
        nodeId,
        name: nodeNames[nodeId] || nodeId,
        min: display(min, 'Temperature'),
        max: display(max, 'Temperature'),
        avg: display(avg, 'Temperature'),
        initial: display(initial, 'Temperature'),
        final: display(final, 'Temperature'),
        delta: display(final, 'Temperature') - display(initial, 'Temperature'),
        status: overall,
        compDelta,
      };
    });
  }, [nodeResults, nodeNames, nodeLimits, comparisonNodeResults, display]);

  const hasComparison = rows.some((r) => r.compDelta != null);

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Temperature Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Node</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_min ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_max ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_avg ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_initial ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_final ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">ΔT ({tempLabel})</th>
              {hasComparison && (
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">ΔT_cmp ({tempLabel})</th>
              )}
              {whatIfDeltaTs && (
                <th className="text-right py-2 px-3 text-muted-foreground font-medium text-amber-400/70">ΔT_wi ({tempLabel})</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.nodeId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 text-center" title={row.status}>
                  {STATUS_ICON[row.status]}
                </td>
                <td className="py-2 px-3 font-medium">{row.name}</td>
                <td className="py-2 px-3 text-right font-mono text-accent-cyan">{row.min.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-accent-orange">{row.max.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{row.avg.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{row.initial.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{row.final.toFixed(2)}</td>
                <td className={`py-2 px-3 text-right font-mono ${row.delta > 0 ? 'text-accent-orange' : 'text-accent-cyan'}`}>
                  {row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}
                </td>
                {hasComparison && (
                  <td className={`py-2 px-3 text-right font-mono ${(row.compDelta ?? 0) > 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {row.compDelta != null ? `${row.compDelta > 0 ? '+' : ''}${row.compDelta.toFixed(2)}` : '—'}
                  </td>
                )}
                {whatIfDeltaTs && (() => {
                  const dt = whatIfDeltaTs[row.nodeId] ?? 0;
                  const absD = Math.abs(dt);
                  const color = absD < 0.1 ? 'text-slate-500' : dt > 0 ? 'text-red-400' : 'text-blue-400';
                  return (
                    <td className={`py-2 px-3 text-right font-mono ${color}`}>
                      {absD < 0.1 ? '—' : `${dt > 0 ? '+' : ''}${dt.toFixed(2)}`}
                    </td>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
