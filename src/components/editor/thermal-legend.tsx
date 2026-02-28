'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { generateLegendStops, type ColorScale } from '@/lib/thermal-colors';

const SCALE_LABELS: Record<ColorScale, string> = {
  rainbow: 'Rainbow',
  inferno: 'Inferno',
  'cool-warm': 'Cool-Warm',
};

export function ThermalLegend() {
  const renderMode = useEditorStore((s) => s.viewportState.renderMode);
  const colorScale = useEditorStore((s) => s.viewportState.colorScale);
  const thermalRange = useEditorStore((s) => s.viewportState.thermalRange);
  const setThermalRange = useEditorStore((s) => s.setThermalRange);

  const stops = useMemo(
    () => generateLegendStops(thermalRange, colorScale, 20),
    [thermalRange, colorScale],
  );

  const gradient = useMemo(
    () => stops.map((s) => `${s.color} ${s.offset}`).join(', '),
    [stops],
  );

  if (renderMode !== 'thermal') return null;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = i / (tickCount - 1);
    return thermalRange.min + t * (thermalRange.max - thermalRange.min);
  });

  return (
    <div
      className="absolute bottom-14 right-3 z-10 flex flex-col items-end gap-1"
      style={{
        background: 'rgba(5,10,20,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '8px 10px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
        {SCALE_LABELS[colorScale]} · Temperature (K)
      </div>
      <div className="flex items-stretch gap-1.5">
        {/* Color bar */}
        <div
          className="w-3 rounded-sm"
          style={{
            height: '120px',
            background: `linear-gradient(to top, ${gradient})`,
          }}
        />
        {/* Tick labels */}
        <div className="flex flex-col justify-between h-[120px]">
          {[...ticks].reverse().map((val, i) => (
            <div key={i} className="text-[9px] font-mono text-slate-300 leading-none">
              {val.toFixed(0)}
            </div>
          ))}
        </div>
      </div>
      {/* Range controls */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <label className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
          <input
            type="checkbox"
            checked={thermalRange.auto}
            onChange={(e) => setThermalRange({ auto: e.target.checked })}
            className="h-2.5 w-2.5"
          />
          Auto
        </label>
        {!thermalRange.auto && (
          <>
            <input
              type="number"
              value={thermalRange.min}
              onChange={(e) => setThermalRange({ min: Number(e.target.value) })}
              className="w-10 h-4 text-[8px] font-mono bg-black/40 border border-white/10 rounded px-1 text-slate-300"
            />
            <span className="text-[8px] text-slate-500">–</span>
            <input
              type="number"
              value={thermalRange.max}
              onChange={(e) => setThermalRange({ max: Number(e.target.value) })}
              className="w-10 h-4 text-[8px] font-mono bg-black/40 border border-white/10 rounded px-1 text-slate-300"
            />
          </>
        )}
      </div>
    </div>
  );
}
