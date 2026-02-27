import { useUnitsStore } from '@/lib/stores/units-store';
import { formatValue, parseInput, getUnitLabel, toDisplay } from '@/lib/units';
import type { QuantityType } from '@/lib/units';
import { useCallback } from 'react';

/** Convenience hook wrapping units store + conversion functions */
export function useUnits() {
  const { unitSystem, tempUnit } = useUnitsStore();

  const fmt = useCallback(
    (value: number, quantity: QuantityType, decimals?: number) =>
      formatValue(value, quantity, unitSystem, tempUnit, decimals),
    [unitSystem, tempUnit],
  );

  const parse = useCallback(
    (displayValue: number, quantity: QuantityType) =>
      parseInput(displayValue, quantity, unitSystem, tempUnit),
    [unitSystem, tempUnit],
  );

  const label = useCallback(
    (quantity: QuantityType) => getUnitLabel(quantity, unitSystem, tempUnit),
    [unitSystem, tempUnit],
  );

  const display = useCallback(
    (value: number, quantity: QuantityType) =>
      toDisplay(value, quantity, unitSystem, tempUnit),
    [unitSystem, tempUnit],
  );

  return { unitSystem, tempUnit, fmt, parse, label, display };
}
