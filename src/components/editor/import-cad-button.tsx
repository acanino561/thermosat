'use client';

import { useRef, useCallback, useState } from 'react';
import { Upload, X, FileBox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useEditorStore, type CadGeometry } from '@/lib/stores/editor-store';
import { parseStepFile, validateStepFile, type ParseResult } from '@/lib/cad/step-parser';

export function ImportCadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const cadImportStatus = useEditorStore((s) => s.cadImportStatus);
  const cadImportProgress = useEditorStore((s) => s.cadImportProgress);
  const cadGeometry = useEditorStore((s) => s.cadGeometry);
  const setCadGeometry = useEditorStore((s) => s.setCadGeometry);
  const setCadImportStatus = useEditorStore((s) => s.setCadImportStatus);
  const setCadImportProgress = useEditorStore((s) => s.setCadImportProgress);
  const clearCadGeometry = useEditorStore((s) => s.clearCadGeometry);

  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    // Validate
    const validationError = validateStepFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCadImportStatus('parsing');
    setCadImportProgress({ percent: 0, message: 'Starting…' });

    try {
      const result: ParseResult = await parseStepFile(file, (progress) => {
        setCadImportProgress(progress);
      });

      const geometry: CadGeometry = {
        fileName: file.name,
        faces: result.faces,
        boundingBox: result.boundingBox,
        totalSurfaceArea: result.totalSurfaceArea,
      };

      setCadGeometry(geometry);
    } catch (err: any) {
      setCadImportStatus('error');
      setError(err.message || 'Failed to parse STEP file.');
    }
  }, [setCadGeometry, setCadImportStatus, setCadImportProgress]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const isParsing = cadImportStatus === 'parsing';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".step,.stp"
        onChange={handleInputChange}
        className="hidden"
      />

      {cadGeometry ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-[11px] font-mono"
              onClick={clearCadGeometry}
            >
              <FileBox className="h-3.5 w-3.5 text-cyan-400" />
              <span className="max-w-[120px] truncate text-cyan-400">{cadGeometry.fileName}</span>
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {cadGeometry.faces.length} faces · {cadGeometry.totalSurfaceArea.toFixed(2)} m² · Click to remove
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClick}
              disabled={isParsing}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import STEP file</TooltipContent>
        </Tooltip>
      )}

      {/* Parsing progress overlay */}
      {isParsing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-80 p-5 rounded-lg"
            style={{
              background: 'rgba(5,10,20,0.95)',
              border: '1px solid rgba(0,229,255,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              <span className="text-sm font-mono text-slate-200">Importing STEP File</span>
            </div>
            <Progress value={cadImportProgress.percent} className="h-2 mb-2" />
            <div className="text-[11px] font-mono text-slate-400">
              {cadImportProgress.message}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div
            className="px-4 py-3 rounded-lg text-sm font-mono flex items-start gap-2"
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.4)',
              color: '#fca5a5',
            }}
          >
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
