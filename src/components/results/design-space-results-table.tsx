'use client';

import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ArrowUp, ArrowDown } from 'lucide-react';
import type {
  ExplorationSampleResult,
  ExplorationParameter,
} from '@/lib/solver/design-space';

interface DesignSpaceResultsTableProps {
  results: ExplorationSampleResult[];
  parameters: ExplorationParameter[];
}

function paramKey(p: ExplorationParameter): string {
  return `${p.entityType}_${p.entityId}_${p.property}`;
}

function paramLabel(p: ExplorationParameter): string {
  return `${p.entityType} · ${p.property}`;
}

type SortKey = 'sampleIndex' | 'maxTemp' | 'feasible' | `param_${number}`;

export function DesignSpaceResultsTable({ results, parameters }: DesignSpaceResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('maxTemp');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(true); }
  };

  const rows = useMemo(() => {
    const mapped = results.map((s) => {
      const maxTemp = s.nodeResults.length > 0
        ? Math.max(...s.nodeResults.map((nr) => nr.maxTemp))
        : 0;
      return { sample: s, maxTemp };
    });

    mapped.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'sampleIndex') cmp = a.sample.sampleIndex - b.sample.sampleIndex;
      else if (sortKey === 'maxTemp') cmp = a.maxTemp - b.maxTemp;
      else if (sortKey === 'feasible') cmp = (a.sample.feasible ? 1 : 0) - (b.sample.feasible ? 1 : 0);
      else if (sortKey.startsWith('param_')) {
        const idx = parseInt(sortKey.split('_')[1]);
        const p = parameters[idx];
        if (p) {
          const aVal = a.sample.paramValues[paramKey(p)] ?? 0;
          const bVal = b.sample.paramValues[paramKey(p)] ?? 0;
          cmp = aVal - bVal;
        }
      }
      return sortAsc ? cmp : -cmp;
    });

    return mapped;
  }, [results, parameters, sortKey, sortAsc]);

  const downloadCsv = useCallback(() => {
    const headers = ['Sample #', ...parameters.map(paramLabel), 'Max Temp (K)', 'Feasible'];
    const csvRows = rows.map((r) =>
      [
        r.sample.sampleIndex,
        ...parameters.map((p) => r.sample.paramValues[paramKey(p)]?.toPrecision(3) ?? ''),
        r.maxTemp.toFixed(1),
        r.sample.feasible,
      ].join(','),
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-space-table.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, parameters]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ArrowUp className="h-3 w-3 inline ml-0.5" /> : <ArrowDown className="h-3 w-3 inline ml-0.5" />;
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th
                className="px-3 py-2 text-left text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => toggleSort('sampleIndex')}
              >
                # <SortIcon col="sampleIndex" />
              </th>
              {parameters.map((p, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-white/50 font-medium cursor-pointer hover:text-white/70"
                  onClick={() => toggleSort(`param_${i}`)}
                >
                  {paramLabel(p)} <SortIcon col={`param_${i}`} />
                </th>
              ))}
              <th
                className="px-3 py-2 text-left text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => toggleSort('maxTemp')}
              >
                Max Temp (K) <SortIcon col="maxTemp" />
              </th>
              <th
                className="px-3 py-2 text-center text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => toggleSort('feasible')}
              >
                Feasible <SortIcon col="feasible" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sample.sampleIndex} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-1.5 font-mono text-white/40">{r.sample.sampleIndex}</td>
                {parameters.map((p, i) => (
                  <td key={i} className="px-3 py-1.5 font-mono">
                    {r.sample.paramValues[paramKey(p)]?.toPrecision(3) ?? '—'}
                  </td>
                ))}
                <td className="px-3 py-1.5 font-mono">{r.maxTemp.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-center">{r.sample.feasible ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-xs text-white/50 gap-1" onClick={downloadCsv}>
          <Download className="h-3 w-3" /> Download CSV
        </Button>
      </div>
    </div>
  );
}
