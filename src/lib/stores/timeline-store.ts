import { create } from 'zustand';
import { TOTAL_TIME_MIN, NUM_POINTS, TIME_STEP_MIN } from '@/lib/demo/simulation-data';

interface TimelineState {
  /** Current time in minutes */
  currentTime: number;
  /** Current time index (for array lookups) */
  currentIndex: number;
  /** Whether the timeline is playing */
  isPlaying: boolean;
  /** Playback speed multiplier (1 = 1 orbit-minute per real-second) */
  playbackSpeed: number;
  /** Total duration in minutes */
  totalTime: number;

  // Actions
  setTime: (timeMin: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setPlaybackSpeed: (speed: number) => void;
  tick: (deltaMs: number) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  currentTime: 0,
  currentIndex: 0,
  isPlaying: false,
  playbackSpeed: 10, // 10x — one orbit in ~9 seconds
  totalTime: TOTAL_TIME_MIN,

  setTime: (timeMin) => {
    const clamped = Math.max(0, Math.min(timeMin, TOTAL_TIME_MIN));
    const index = Math.min(Math.round(clamped / TIME_STEP_MIN), NUM_POINTS - 1);
    set({ currentTime: clamped, currentIndex: index });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  tick: (deltaMs) => {
    const { isPlaying, currentTime, playbackSpeed } = get();
    if (!isPlaying) return;

    const deltaMin = (deltaMs / 1000) * playbackSpeed;
    let newTime = currentTime + deltaMin;

    // Loop back to start
    if (newTime >= TOTAL_TIME_MIN) {
      newTime = 0;
    }

    const index = Math.min(Math.round(newTime / TIME_STEP_MIN), NUM_POINTS - 1);
    set({ currentTime: newTime, currentIndex: index });
  },
}));
