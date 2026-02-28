/**
 * Thermal color mapping utilities.
 * Maps temperature values to RGB colors using various color scales.
 */

export type ColorScale = 'rainbow' | 'inferno' | 'cool-warm';

export interface ThermalRange {
  min: number;
  max: number;
  auto: boolean;
}

// ─── Color Scale Definitions ────────────────────────────────────────

/** Rainbow: blue → cyan → green → yellow → red */
const RAINBOW_STOPS: [number, [number, number, number]][] = [
  [0.0, [0, 0, 1]],
  [0.25, [0, 1, 1]],
  [0.5, [0, 1, 0]],
  [0.75, [1, 1, 0]],
  [1.0, [1, 0, 0]],
];

/** Inferno (colorblind-safe): black → purple → red → yellow → white */
const INFERNO_STOPS: [number, [number, number, number]][] = [
  [0.0, [0, 0, 0.07]],
  [0.2, [0.32, 0.06, 0.44]],
  [0.4, [0.69, 0.17, 0.27]],
  [0.6, [0.93, 0.38, 0.1]],
  [0.8, [0.99, 0.72, 0.15]],
  [1.0, [0.99, 0.99, 0.75]],
];

/** Cool-warm diverging: blue → white → red */
const COOL_WARM_STOPS: [number, [number, number, number]][] = [
  [0.0, [0.23, 0.3, 0.75]],
  [0.5, [0.87, 0.87, 0.87]],
  [1.0, [0.71, 0.02, 0.15]],
];

const SCALES: Record<ColorScale, [number, [number, number, number]][]> = {
  rainbow: RAINBOW_STOPS,
  inferno: INFERNO_STOPS,
  'cool-warm': COOL_WARM_STOPS,
};

function lerpRGB(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function sampleScale(
  stops: [number, [number, number, number]][],
  t: number,
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (clamped >= s0 && clamped <= s1) {
      const local = (clamped - s0) / (s1 - s0);
      return lerpRGB(c0, c1, local);
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Map a temperature value to an RGB color.
 * Returns [r, g, b] in 0–1 range.
 */
export function temperatureToRGB(
  temp: number,
  range: ThermalRange,
  scale: ColorScale = 'rainbow',
): [number, number, number] {
  const span = range.max - range.min;
  const t = span > 0 ? (temp - range.min) / span : 0.5;
  return sampleScale(SCALES[scale], t);
}

/**
 * Map a temperature value to a CSS hex color string.
 */
export function temperatureToHex(
  temp: number,
  range: ThermalRange,
  scale: ColorScale = 'rainbow',
): string {
  const [r, g, b] = temperatureToRGB(temp, range, scale);
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate gradient stops for a CSS linear-gradient legend.
 * Returns an array of { offset: string; color: string } entries.
 */
export function generateLegendStops(
  range: ThermalRange,
  scale: ColorScale = 'rainbow',
  steps: number = 10,
): { offset: string; color: string }[] {
  const result: { offset: string; color: string }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const temp = range.min + t * (range.max - range.min);
    result.push({
      offset: `${(t * 100).toFixed(0)}%`,
      color: temperatureToHex(temp, range, scale),
    });
  }
  return result;
}
