'use client';

import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

interface ExportButtonsProps {
  projectId: string;
  modelId: string;
  runId: string;
}

export function ExportButtons({ projectId, modelId, runId }: ExportButtonsProps) {
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/results/${runId}/export?format=${format}`,
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation_results_${runId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => handleExport('csv')}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => handleExport('json')}
      >
        <FileJson className="h-4 w-4" />
        Export JSON
      </Button>
    </div>
  );
}
