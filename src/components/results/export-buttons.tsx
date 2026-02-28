'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileBox } from 'lucide-react';

interface ExportButtonsProps {
  projectId: string;
  modelId: string;
  runId: string;
}

type ExportFormat =
  | 'csv-temp'
  | 'csv-flow'
  | 'json-results'
  | 'json-full'
  | 'vxm';

const FORMAT_CONFIG: Record<
  ExportFormat,
  { label: string; ext: string; icon: 'csv' | 'json' | 'vxm' }
> = {
  'csv-temp': { label: 'Temperature CSV', ext: 'csv', icon: 'csv' },
  'csv-flow': { label: 'Heat Flow CSV', ext: 'csv', icon: 'csv' },
  'json-results': { label: 'Results JSON', ext: 'json', icon: 'json' },
  'json-full': { label: 'Full Model + Results JSON', ext: 'json', icon: 'json' },
  vxm: { label: 'Verixos Model (.vxm)', ext: 'vxm', icon: 'vxm' },
};

export function ExportButtons({ projectId, modelId, runId }: ExportButtonsProps) {
  const download = async (format: ExportFormat) => {
    try {
      let url: string;
      if (format === 'vxm') {
        url = `/api/projects/${projectId}/models/${modelId}/export?format=vxm`;
      } else {
        url = `/api/projects/${projectId}/models/${modelId}/results/${runId}/export?format=${format}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const config = FORMAT_CONFIG[format];
      a.download = `${format === 'vxm' ? 'model' : 'simulation'}_${runId.slice(0, 8)}.${config.ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download('csv-temp')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Temperature CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('csv-flow')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Heat Flow CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => download('json-results')}>
          <FileJson className="mr-2 h-4 w-4" />
          Results JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('json-full')}>
          <FileJson className="mr-2 h-4 w-4" />
          Full Model + Results
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => download('vxm')}>
          <FileBox className="mr-2 h-4 w-4" />
          Verixos Model (.vxm)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
