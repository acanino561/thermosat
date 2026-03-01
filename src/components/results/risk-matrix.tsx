'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskMatrixCase {
  id: string;
  failureType: string;
  label: string | null;
  runId: string | null;
}

interface NodeCaseResult {
  caseId: string;
  failureType: string;
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  status: 'pass' | 'warn' | 'fail';
}

interface RiskMatrixNode {
  nodeId: string;
  nodeName: string;
  tempLimitMin: number | null;
  tempLimitMax: number | null;
  cases: NodeCaseResult[];
}

interface RiskMatrixData {
  analysisId: string;
  cases: RiskMatrixCase[];
  riskMatrix: RiskMatrixNode[];
}

const FAILURE_TYPE_LABELS: Record<string, string> = {
  heater_failure: 'Heater Failure',
  mli_degradation: 'MLI Degradation',
  coating_degradation_eol: 'Coating Deg. (EOL)',
  attitude_loss_tumble: 'Attitude Loss',
  power_budget_reduction: 'Power Reduction',
  conductor_failure: 'Conductor Failure',
  component_power_spike: 'Power Spike',
};

function getCellStyle(status: 'pass' | 'warn' | 'fail', hasLimits: boolean) {
  if (!hasLimits) {
    return 'bg-[#1f2937] text-white/60';
  }
  switch (status) {
    case 'pass':
      return 'bg-[#14532d] text-[#22c55e]';
    case 'warn':
      return 'bg-[#78350f] text-[#f59e0b]';
    case 'fail':
      return 'bg-[#7f1d1d] text-[#ef4444]';
  }
}

function StatusIcon({ status, hasLimits }: { status: 'pass' | 'warn' | 'fail'; hasLimits: boolean }) {
  if (!hasLimits) return null;
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-3 w-3 shrink-0" />;
    case 'warn':
      return <AlertTriangle className="h-3 w-3 shrink-0" />;
    case 'fail':
      return <XCircle className="h-3 w-3 shrink-0" />;
  }
}

interface RiskMatrixProps {
  analysisId: string;
  projectId: string;
  modelId: string;
}

export function RiskMatrix({ analysisId, projectId, modelId }: RiskMatrixProps) {
  const [data, setData] = useState<RiskMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/models/${modelId}/failure-analysis/${analysisId}/results`,
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to fetch results');
        }
        const result: RiskMatrixData = await res.json();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchResults();
    return () => { cancelled = true; };
  }, [analysisId, projectId, modelId]);

  const downloadCsv = useCallback(() => {
    if (!data) return;

    const headers = ['Component', ...data.cases.map((c) => c.label || FAILURE_TYPE_LABELS[c.failureType] || c.failureType)];
    const rows = data.riskMatrix.map((node) => {
      const cells = node.cases.map(
        (c) => `${c.minTemp.toFixed(1)}–${c.maxTemp.toFixed(1)} K (${c.status})`,
      );
      return [node.nodeName, ...cells];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failure-analysis-${analysisId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, analysisId]);

  const handleCellClick = (caseItem: RiskMatrixCase) => {
    if (caseItem.runId) {
      // Navigate to specific simulation run results
      // For now we could open the results in the current viewer
      // or navigate to the run page
      window.open(
        `/dashboard/projects/${projectId}/models/${modelId}?runId=${caseItem.runId}`,
        '_blank',
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading risk matrix...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-red-400">
        <AlertTriangle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data || data.riskMatrix.length === 0) {
    return (
      <div className="text-center py-12 text-white/40">
        No results available.
      </div>
    );
  }

  return (
    <div className="mt-6 border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="font-heading font-semibold text-sm">
          Failure Mode Risk Matrix
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={downloadCsv}
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 py-2 text-white/60 font-medium text-xs sticky left-0 bg-[#0a0a1a] z-10">
                  Component
                </th>
                {data.cases.map((c) => (
                  <th
                    key={c.id}
                    className="text-center px-3 py-2 text-white/60 font-medium text-xs"
                  >
                    {c.label || FAILURE_TYPE_LABELS[c.failureType] || c.failureType}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.riskMatrix.map((node) => {
                const hasLimits =
                  node.tempLimitMin !== null || node.tempLimitMax !== null;

                return (
                  <tr
                    key={node.nodeId}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-xs whitespace-nowrap sticky left-0 bg-[#0a0a1a] z-10">
                      {node.nodeName}
                    </td>
                    {node.cases.map((caseResult, ci) => {
                      const caseItem = data.cases[ci];
                      return (
                        <td key={caseResult.caseId} className="px-1 py-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'w-full rounded px-2 py-1.5 text-xs flex items-center justify-center gap-1 transition-opacity hover:opacity-80',
                                  getCellStyle(caseResult.status, hasLimits),
                                  caseItem?.runId && 'cursor-pointer',
                                )}
                                onClick={() => caseItem && handleCellClick(caseItem)}
                              >
                                <StatusIcon
                                  status={caseResult.status}
                                  hasLimits={hasLimits}
                                />
                                <span>
                                  {caseResult.minTemp.toFixed(0)}–
                                  {caseResult.maxTemp.toFixed(0)} K
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <div className="space-y-0.5">
                                <div>Min: {caseResult.minTemp.toFixed(2)} K</div>
                                <div>Max: {caseResult.maxTemp.toFixed(2)} K</div>
                                <div>Mean: {caseResult.meanTemp.toFixed(2)} K</div>
                                {hasLimits && (
                                  <div className="pt-1 border-t border-white/20">
                                    Limits: {node.tempLimitMin ?? '—'} / {node.tempLimitMax ?? '—'} K
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
