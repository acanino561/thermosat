// Units conversion and formatting module
// Internal storage is ALWAYS SI (Kelvin, meters, watts, etc.)

export type QuantityType =
  | 'Temperature'
  | 'Length'
  | 'Mass'
  | 'Power'
  | 'Conductance'
  | 'HeatFlux'
  | 'SpecificHeat'
  | 'ThermalConductivity'
  | 'Density'
  | 'Area';

export type UnitSystem = 'SI' | 'Imperial';
export type TempUnit = 'K' | 'C' | 'F';

// Conversion factors: multiply SI value by factor to get Imperial
const CONVERSIONS: Record<Exclude<QuantityType, 'Temperature'>, { factor: number; siLabel: string; imperialLabel: string }> = {
  Length:               { factor: 3.28084,     siLabel: 'm',              imperialLabel: 'ft' },
  Mass:                 { factor: 2.20462,     siLabel: 'kg',             imperialLabel: 'lbm' },
  Power:                { factor: 3.41214,     siLabel: 'W',              imperialLabel: 'BTU/hr' },
  Conductance:          { factor: 1.89563,     siLabel: 'W/K',            imperialLabel: 'BTU/(hr·°F)' },
  HeatFlux:             { factor: 0.316998,    siLabel: 'W/m²',           imperialLabel: 'BTU/(hr·ft²)' },
  SpecificHeat:         { factor: 0.000238846, siLabel: 'J/(kg·K)',       imperialLabel: 'BTU/(lbm·°F)' },
  ThermalConductivity:  { factor: 0.577789,    siLabel: 'W/(m·K)',        imperialLabel: 'BTU/(hr·ft·°F)' },
  Density:              { factor: 0.062428,    siLabel: 'kg/m³',          imperialLabel: 'lbm/ft³' },
  Area:                 { factor: 10.7639,     siLabel: 'm²',             imperialLabel: 'ft²' },
};

function convertTempFromSI(kelvin: number, tempUnit: TempUnit): number {
  switch (tempUnit) {
    case 'K': return kelvin;
    case 'C': return kelvin - 273.15;
    case 'F': return (kelvin - 273.15) * 9 / 5 + 32;
  }
}

function convertTempToSI(value: number, tempUnit: TempUnit): number {
  switch (tempUnit) {
    case 'K': return value;
    case 'C': return value + 273.15;
    case 'F': return (value - 32) * 5 / 9 + 273.15;
  }
}

function getTempLabel(tempUnit: TempUnit): string {
  switch (tempUnit) {
    case 'K': return 'K';
    case 'C': return '°C';
    case 'F': return '°F';
  }
}

/** Resolve effective temp unit: Imperial forces °F, SI uses user's tempUnit (K or °C) */
function resolveTemp(unitSystem: UnitSystem, tempUnit: TempUnit): TempUnit {
  if (unitSystem === 'Imperial') return 'F';
  // In SI mode, allow K or C; if somehow F is set, default to K
  return tempUnit === 'F' ? 'K' : tempUnit;
}

/**
 * Format a value from SI internal units to display string.
 * For Temperature, pass tempUnit to control K/°C/°F independently.
 */
export function formatValue(
  value: number,
  quantity: QuantityType,
  unitSystem: UnitSystem,
  tempUnit: TempUnit = 'K',
  decimals: number = 2,
): string {
  if (quantity === 'Temperature') {
    const effectiveTemp = resolveTemp(unitSystem, tempUnit);
    const converted = convertTempFromSI(value, effectiveTemp);
    return `${converted.toFixed(decimals)} ${getTempLabel(effectiveTemp)}`;
  }
  const conv = CONVERSIONS[quantity];
  if (unitSystem === 'Imperial') {
    return `${(value * conv.factor).toFixed(decimals)} ${conv.imperialLabel}`;
  }
  return `${value.toFixed(decimals)} ${conv.siLabel}`;
}

/**
 * Convert a display value back to SI for storage.
 */
export function parseInput(
  displayValue: number,
  quantity: QuantityType,
  unitSystem: UnitSystem,
  tempUnit: TempUnit = 'K',
): number {
  if (quantity === 'Temperature') {
    const effectiveTemp = resolveTemp(unitSystem, tempUnit);
    return convertTempToSI(displayValue, effectiveTemp);
  }
  if (unitSystem === 'Imperial') {
    return displayValue / CONVERSIONS[quantity].factor;
  }
  return displayValue;
}

/**
 * Get the unit label string for a quantity.
 */
export function getUnitLabel(
  quantity: QuantityType,
  unitSystem: UnitSystem,
  tempUnit: TempUnit = 'K',
): string {
  if (quantity === 'Temperature') {
    return getTempLabel(resolveTemp(unitSystem, tempUnit));
  }
  const conv = CONVERSIONS[quantity];
  return unitSystem === 'Imperial' ? conv.imperialLabel : conv.siLabel;
}

/**
 * Convert SI value to display value (numeric only, no formatting).
 */
export function toDisplay(
  value: number,
  quantity: QuantityType,
  unitSystem: UnitSystem,
  tempUnit: TempUnit = 'K',
): number {
  if (quantity === 'Temperature') {
    return convertTempFromSI(value, resolveTemp(unitSystem, tempUnit));
  }
  if (unitSystem === 'Imperial') {
    return value * CONVERSIONS[quantity].factor;
  }
  return value;
}
