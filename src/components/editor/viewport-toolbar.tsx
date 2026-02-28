'use client';

import { useCallback } from 'react';
import {
  Box,
  Grid3x3,
  Thermometer,
  Paintbrush,
  Camera,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useEditorStore, type RenderMode, type CameraPreset } from '@/lib/stores/editor-store';
import type { ColorScale } from '@/lib/thermal-colors';

const RENDER_MODE_LABELS: Record<RenderMode, { label: string; icon: typeof Box }> = {
  solid: { label: 'Solid', icon: Box },
  wireframe: { label: 'Wireframe', icon: Grid3x3 },
  thermal: { label: 'Thermal', icon: Thermometer },
  material: { label: 'Material', icon: Paintbrush },
};

const COLOR_SCALE_LABELS: Record<ColorScale, string> = {
  rainbow: 'Rainbow',
  inferno: 'Inferno (Colorblind-safe)',
  'cool-warm': 'Cool-Warm Diverging',
};

const CAMERA_PRESETS: { preset: CameraPreset; label: string }[] = [
  { preset: 'isometric', label: 'Isometric' },
  { preset: '+x', label: '+X (Right)' },
  { preset: '-x', label: '−X (Left)' },
  { preset: '+y', label: '+Y (Top)' },
  { preset: '-y', label: '−Y (Bottom)' },
  { preset: '+z', label: '+Z (Front)' },
  { preset: '-z', label: '−Z (Back)' },
  { preset: 'fit-all', label: 'Fit All' },
];

interface ViewportToolbarProps {
  onScreenshot: () => void;
}

export function ViewportToolbar({ onScreenshot }: ViewportToolbarProps) {
  const renderMode = useEditorStore((s) => s.viewportState.renderMode);
  const colorScale = useEditorStore((s) => s.viewportState.colorScale);
  const setRenderMode = useEditorStore((s) => s.setRenderMode);
  const setColorScale = useEditorStore((s) => s.setColorScale);
  const setCameraPreset = useEditorStore((s) => s.setCameraPreset);

  const ActiveIcon = RENDER_MODE_LABELS[renderMode].icon;

  return (
    <div
      className="absolute top-3 left-3 z-10 flex items-center gap-1.5"
      style={{
        background: 'rgba(5,10,20,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '4px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Render Mode */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-white gap-1.5">
            <ActiveIcon className="h-3.5 w-3.5" />
            {RENDER_MODE_LABELS[renderMode].label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuLabel className="text-[10px] font-mono">Render Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={renderMode} onValueChange={(v) => setRenderMode(v as RenderMode)}>
            {(Object.entries(RENDER_MODE_LABELS) as [RenderMode, { label: string; icon: typeof Box }][]).map(([mode, { label, icon: Icon }]) => (
              <DropdownMenuRadioItem key={mode} value={mode} className="text-xs font-mono gap-2">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {renderMode === 'thermal' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs font-mono">Color Scale</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={colorScale} onValueChange={(v) => setColorScale(v as ColorScale)}>
                    {(Object.entries(COLOR_SCALE_LABELS) as [ColorScale, string][]).map(([scale, label]) => (
                      <DropdownMenuRadioItem key={scale} value={scale} className="text-xs font-mono">
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separator */}
      <div className="w-px h-4 bg-white/10" />

      {/* Camera Presets */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-white gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuLabel className="text-[10px] font-mono">Camera Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CAMERA_PRESETS.map(({ preset, label }) => (
            <DropdownMenuItem
              key={preset}
              className="text-xs font-mono"
              onClick={() => setCameraPreset(preset)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separator */}
      <div className="w-px h-4 bg-white/10" />

      {/* Screenshot */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-white"
        onClick={onScreenshot}
        title="Screenshot (PNG)"
      >
        <Camera className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
