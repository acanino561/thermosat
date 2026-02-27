import { create } from 'zustand';
import type { UnitSystem, TempUnit } from '@/lib/units';

interface UnitsState {
  unitSystem: UnitSystem;
  tempUnit: TempUnit;
  loaded: boolean;
  setUnitSystem: (system: UnitSystem) => void;
  setTempUnit: (unit: TempUnit) => void;
  loadFromProfile: () => Promise<void>;
}

export const useUnitsStore = create<UnitsState>((set, get) => ({
  unitSystem: 'SI',
  tempUnit: 'K',
  loaded: false,

  setUnitSystem: async (system: UnitSystem) => {
    set({ unitSystem: system });
    // If switching to Imperial, force temp to F
    if (system === 'Imperial') {
      set({ tempUnit: 'F' });
    }
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitsPref: system.toLowerCase(),
          ...(system === 'Imperial' ? { tempUnit: 'F' } : {}),
        }),
      });
    } catch (e) {
      console.error('Failed to save unit preference:', e);
    }
  },

  setTempUnit: async (unit: TempUnit) => {
    set({ tempUnit: unit });
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempUnit: unit }),
      });
    } catch (e) {
      console.error('Failed to save temp unit preference:', e);
    }
  },

  loadFromProfile: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        set({
          unitSystem: data.unitsPref === 'imperial' ? 'Imperial' : 'SI',
          tempUnit: (data.tempUnit as TempUnit) || 'K',
          loaded: true,
        });
      }
    } catch (e) {
      console.error('Failed to load unit preferences:', e);
    }
  },
}));
