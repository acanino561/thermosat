/**
 * PBR material properties derived from a node's assigned material name.
 * Used to give visually distinct appearances to MLI, radiator, structural,
 * PCB, and other surface types in the 3D viewport.
 */

export interface PBRProperties {
  color: string;
  roughness: number;
  metalness: number;
}

/**
 * Determine PBR material properties from a material name string.
 * Falls back to sensible defaults for unknown materials.
 */
export function getPBRProperties(
  materialName: string | null | undefined,
  absorptivity?: number | null,
  emissivity?: number | null,
): PBRProperties {
  const name = (materialName ?? '').toLowerCase();

  // MLI (multi-layer insulation) — shiny metallic
  if (name.includes('mli')) {
    const isGold = name.includes('gold') || name.includes('kapton');
    return {
      color: isGold ? '#C8A84B' : '#C0C0C0',
      roughness: 0.15,
      metalness: 0.8,
    };
  }

  // FR4 / PCB — dark green matte
  if (name.includes('fr4') || name.includes('pcb')) {
    return {
      color: '#1a3a1a',
      roughness: 0.8,
      metalness: 0,
    };
  }

  // Aluminium / aluminum — structural grey
  if (name.includes('alumin')) {
    return {
      color: '#8a8a8a',
      roughness: 0.6,
      metalness: 0.3,
    };
  }

  // Radiator surfaces — matte dark
  if (name.includes('radiator')) {
    return {
      color: '#2a2a30',
      roughness: 0.9,
      metalness: 0.05,
    };
  }

  // Property-based fallbacks
  const alpha = absorptivity ?? 0;
  const eps = emissivity ?? 0;

  // High emissivity radiator-like
  if (eps > 0.7) {
    return {
      color: '#303035',
      roughness: 0.9,
      metalness: 0.05,
    };
  }

  // High absorptivity — dark surface
  if (alpha > 0.7) {
    return {
      color: '#3a3a3a',
      roughness: 0.7,
      metalness: 0.1,
    };
  }

  // Default — neutral grey
  return {
    color: '#6a6a6a',
    roughness: 0.5,
    metalness: 0.1,
  };
}
