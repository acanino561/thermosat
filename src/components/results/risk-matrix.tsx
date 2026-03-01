'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskMatrixData } from './failure-mode-panel';

interface RiskMatrixProps {
  data: RiskMatrixData;
}

const STATUS_STYLES: Record<string, string> = {
  pass: 'bg-green-950 text-green-400',
  warn: 'bg-yellow-950 text-yellow-400',
  fail: 'bg-red-950 text-red-400',
};

const DEFAULT_STYLE = 'bg-gray-900 text-gray-400';

export function RiskMatrix({ data }: RiskMatrixProps) {
  const { cases, riskMatrix } = data;

  const handleDownloadCsv = useCallback(() => {
    const headers = ['Node', ...cases.map((c) => c.label ?? c.failureType)];
    const rows = riskMatrix.map((row) => {
      const cells = row.cases.map(
        (c) => `${c.minTemp.toFixed(0)}-${c.maxTemp.toFixed(0)} K`,
      );
      return [row.nodeName, ...cells];
    });

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-matrix-${data.analysisId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, cases, riskMatrix]);

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-cyan-400" />
          <h3 className="font-heading text-sm font-semibold">Risk Matrix</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadCsv}
          className="text-xs font-mono gap-1.5 h-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Download className="h-3 w-3" />
          Download CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-slate-400 font-medium">Node</th>
              {cases.map((c) => (
                <th key={c.id} className="text-center py-2 px-2 text-slate-400 font-medium whitespace-nowrap">
                  {c.label ?? c.failureType.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riskMatrix.map((row) => (
              <tr key={row.nodeId} className="border-b border-white/5">
                <td className="py-1.5 px-2 text-slate-300 whitespace-nowrap">{row.nodeName}</td>
                {row.cases.map((c) => (
                  <td
                    key={c.caseId}
                    className={cn(
                      'py-1.5 px-2 text-center whitespace-nowrap rounded-sm',
                      c.status ? (STATUS_STYLES[c.status] ?? DEFAULT_STYLE) : DEFAULT_STYLE,
                    )}
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
