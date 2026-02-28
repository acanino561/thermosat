'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitCompareArrows, X } from 'lucide-react';

interface SimulationRun {
  id: string;
  label: string;
  completedAt: string;
}

interface RunComparisonProps {
  currentRunId: string;
  availableRuns: SimulationRun[];
  comparisonRunId: string | null;
  onSelectComparison: (runId: string | null) => void;
}

export function RunComparison({
  currentRunId,
  availableRuns,
  comparisonRunId,
  onSelectComparison,
}: RunComparisonProps) {
  const otherRuns = availableRuns.filter((r) => r.id !== currentRunId);

  if (otherRuns.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {comparisonRunId ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <GitCompareArrows className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-muted-foreground">
            Comparing with: {availableRuns.find((r) => r.id === comparisonRunId)?.label ?? comparisonRunId}
          </span>
          <button
            onClick={() => onSelectComparison(null)}
            className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Select onValueChange={(v) => onSelectComparison(v)}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <div className="flex items-center gap-1.5">
              <GitCompareArrows className="w-3.5 h-3.5" />
              <SelectValue placeholder="Compare with..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {otherRuns.map((run) => (
              <SelectItem key={run.id} value={run.id} className="text-xs">
                {run.label} — {new Date(run.completedAt).toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
