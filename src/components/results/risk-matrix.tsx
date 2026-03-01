'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskMatrixData } from './failure-mode-panel';

interface RiskMatrixProps {
  data: RiskMatrixData;
}

export function RiskMatrix({ data }: RiskMatrixProps) {
  const exportCsv = () => {
    const header = ['Component', ...data.cases.map(c => c.label ?? c.failureType)];
    const rows = data.riskMatrix.map(row => [
      row.nodeName,
      ...row.cases.map(c => `${c.minTemp.toFixed(1)}-${c.maxTemp.toFixed(1)} K (${c.status})`),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'failure-mode-analysis.csv';
    a.click();
  };

  const statusClasses: Record<string, string> = {
    pass: 'bg-green-950 text-green-400',
    warn: 'bg-yellow-950 text-yellow-400',
    fail: 'bg-red-950 text-red-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Failure Mode Risk Matrix</h4>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={exportCsv}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left p-2 font-medium text-muted-foreground">Component</th>
              {data.cases.map(c => (
                <th key={c.id} className="text-center p-2 font-medium text-muted-foreground capitalize">
                  {(c.label ?? c.failureType).replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.riskMatrix.map(row => (
              <tr key={row.nodeId} className="border-b border-white/5 last:border-0">
                <td className="p-2 font-medium">{row.nodeName}</td>
                {row.cases.map(c => (
                  <td
                    key={c.caseId}
                    className={cn('p-2 text-center tabular-nums', statusClasses[c.status] ?? 'bg-gray-900 text-gray-400')}
                    title={`Min: ${c.minTemp.toFixed(1)} K | Max: ${c.maxTemp.toFixed(1)} K | Mean: ${c.meanTemp.toFixed(1)} K`}
                  >
                    {c.minTemp.toFixed(0)}–{c.maxTemp.toFixed(0)} K
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
