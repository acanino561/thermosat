'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GitCompare, X } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import type { SimulationResults } from '@/lib/stores/editor-store';

interface SimulationRun {
  id: string;
  label: string;
  completedAt: string;
}

interface ComparisonPickerProps {
  projectId: string;
  modelId: string;
  currentRunId: string;
  availableRuns?: SimulationRun[];
}

export function ComparisonPicker({
  projectId,
  modelId,
  currentRunId,
  availableRuns = [],
}: ComparisonPickerProps) {
  const comparisonRunId = useEditorStore((s) => s.comparisonRunId);
  const setComparisonResults = useEditorStore((s) => s.setComparisonResults);
  const setComparisonRunId = useEditorStore((s) => s.setComparisonRunId);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const otherRuns = availableRuns.filter((r) => r.id !== currentRunId);

  const handleSelect = useCallback(
    async (runId: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/models/${modelId}/results/${runId}`,
        );
        if (!res.ok) throw new Error('Failed to load comparison run');
        const data: SimulationResults = await res.json();
        setComparisonResults(data);
        setComparisonRunId(runId);
        setShowPicker(false);
      } catch (err) {
        console.error('Failed to load comparison results:', err);
      } finally {
        setLoading(false);
      }
    },
    [projectId, modelId, setComparisonResults, setComparisonRunId],
  );

  const handleClear = useCallback(() => {
    setComparisonResults(null);
    setComparisonRunId(null);
  }, [setComparisonResults, setComparisonRunId]);

  return (
    <div className="flex items-center gap-2">
      {comparisonRunId ? (
        <Button variant="outline" size="sm" className="gap-2" onClick={handleClear}>
          <X className="h-3.5 w-3.5" />
          Clear Comparison
        </Button>
      ) : (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowPicker(!showPicker)}
            disabled={otherRuns.length === 0}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </Button>
          {showPicker && otherRuns.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-[#111122] border border-white/10 rounded-lg shadow-xl p-2 min-w-[200px]">
              {otherRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => handleSelect(run.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium">{run.label || run.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{run.completedAt}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
