'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Play, Pause, SkipBack, FastForward } from 'lucide-react';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import {
  ORBIT_PERIOD_MIN,
  TOTAL_TIME_MIN,
  isInEclipse,
  eclipsePeriods,
  getAllTemperaturesAtTime,
  timeToIndex,
  nodeProfiles,
} from '@/lib/demo/simulation-data';
import { cn } from '@/lib/utils';

function tempToHex(temp: number): string {
  if (temp < 200) return '#0044ff';
  if (temp < 250) return '#00ccff';
  if (temp < 300) return '#00ff66';
  if (temp < 350) return '#ffcc00';
  return '#ff3300';
}

/**
 * R3F component that drives timeline animation via useFrame.
 * Must be rendered inside a <Canvas>.
 */
export function TimelineAnimator() {
  const tick = useTimelineStore((s) => s.tick);
  const prevTime = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    if (prevTime.current === 0) {
      prevTime.current = now;
      return;
    }
    const delta = now - prevTime.current;
    prevTime.current = now;
    tick(delta);
  });

  return null;
}

/**
 * Timeline scrubber UI — rendered outside <Canvas> as HTML.
 */
export function TimelineScrubber() {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const setTime = useTimelineStore((s) => s.setTime);
  const togglePlaying = useTimelineStore((s) => s.togglePlaying);
  const setPlaybackSpeed = useTimelineStore((s) => s.setPlaybackSpeed);
  const setPlaying = useTimelineStore((s) => s.setPlaying);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const eclipse = isInEclipse(currentTime);
  const orbitNumber = Math.floor(currentTime / ORBIT_PERIOD_MIN) + 1;
  const orbitPhase = ((currentTime % ORBIT_PERIOD_MIN) / ORBIT_PERIOD_MIN * 100).toFixed(0);

  // Get current temperatures for mini display
  const timeIndex = timeToIndex(currentTime);
  const temps = getAllTemperaturesAtTime(timeIndex);

  const handleScrub = useCallback(
    (clientX: number) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      setTime(fraction * TOTAL_TIME_MIN);
    },
    [setTime],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      handleScrub(e.clientX);
    },
    [handleScrub],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleScrub(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleScrub]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlaying();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlaying]);

  const fraction = currentTime / TOTAL_TIME_MIN;
  const formatTime = (m: number) => {
    const mins = Math.floor(m);
    const secs = Math.floor((m - mins) * 60);
    return `${mins.toString().padStart(3, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [1, 5, 10, 25, 50];

  return (
    <div
      className="shrink-0 select-none"
      style={{
        height: '72px',
        background: 'linear-gradient(180deg, rgba(5,5,5,0.95) 0%, rgba(8,12,20,0.98) 100%)',
        borderTop: '1px solid rgba(0,229,255,0.1)',
      }}
    >
      {/* Scrubber bar */}
      <div className="px-4 pt-2">
        <div
          ref={scrubberRef}
          className="relative h-4 cursor-pointer group"
          onMouseDown={handleMouseDown}
        >
          {/* Track background */}
          <div
            className="absolute inset-x-0 top-1.5 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />

          {/* Eclipse bands */}
          {eclipsePeriods.map((ep, i) => (
            <div
              key={i}
              className="absolute top-1 h-2 rounded-sm"
              style={{
                left: `${(ep.start / TOTAL_TIME_MIN) * 100}%`,
                width: `${((ep.end - ep.start) / TOTAL_TIME_MIN) * 100}%`,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.1)',
              }}
            />
          ))}

          {/* Orbit markers */}
          {[1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-0 h-4"
              style={{
                left: `${(i * ORBIT_PERIOD_MIN / TOTAL_TIME_MIN) * 100}%`,
                width: '1px',
                background: 'rgba(255,255,255,0.08)',
              }}
            />
          ))}

          {/* Progress fill */}
          <div
            className="absolute top-1.5 left-0 h-1 rounded-full transition-none"
            style={{
              width: `${fraction * 100}%`,
              background: eclipse
                ? 'linear-gradient(90deg, #00e5ff, #6366f1)'
                : 'linear-gradient(90deg, #00e5ff, #00ff66)',
            }}
          />

          {/* Playhead */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-none"
            style={{ left: `${fraction * 100}%` }}
          >
            <div
              className="w-2.5 h-4 rounded-sm"
              style={{
                background: eclipse ? '#6366f1' : '#00e5ff',
                boxShadow: `0 0 8px ${eclipse ? '#6366f1' : '#00e5ff'}66`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 px-4 mt-1.5">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPlaying(false); setTime(0); }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Reset"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlaying}
            className={cn(
              'p-1.5 rounded transition-colors',
              isPlaying
                ? 'text-cyan-400 bg-cyan-400/10'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5',
            )}
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Time display */}
        <div className="font-mono text-[11px] text-slate-300 tabular-nums min-w-[90px]">
          {formatTime(currentTime)}
          <span className="text-slate-600 mx-1">/</span>
          <span className="text-slate-500">{formatTime(TOTAL_TIME_MIN)}</span>
        </div>

        {/* Orbit info */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] text-slate-500">
            Orbit {orbitNumber}/3
          </div>
          <div
            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium"
            style={{
              background: eclipse ? 'rgba(99,102,241,0.15)' : 'rgba(0,229,255,0.1)',
              color: eclipse ? '#818cf8' : '#00e5ff',
              border: `1px solid ${eclipse ? 'rgba(99,102,241,0.2)' : 'rgba(0,229,255,0.15)'}`,
            }}
          >
            {eclipse ? '● ECLIPSE' : '☀ SUNLIT'}
          </div>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1 ml-2">
          <FastForward className="w-3 h-3 text-slate-600" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors',
                playbackSpeed === s
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-slate-600 hover:text-slate-400',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Mini temp readout */}
        <div className="flex items-center gap-2">
          {nodeProfiles.slice(0, 6).map((np, i) => (
            <div
              key={i}
              className="text-[9px] font-mono tabular-nums"
              style={{ color: tempToHex(temps[i]) }}
              title={np.name}
            >
              {temps[i].toFixed(0)}K
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
