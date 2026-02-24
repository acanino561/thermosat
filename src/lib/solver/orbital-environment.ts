import {
  EARTH_RADIUS_KM,
  EARTH_MU,
  SOLAR_CONSTANT,
  EARTH_ALBEDO,
  EARTH_IR,
  type OrbitalConfig,
  type OrbitalEnvironment,
  type OrbitalHeatProfile,
} from './types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate approximate sun declination and right ascension for a given date.
 * Uses simplified analytical model (accuracy ~1° for declination).
 */
function getSunPosition(epochDate: Date): {
  declination: number; // radians
  rightAscension: number; // radians
  earthSunDistance: number; // AU
} {
  // Day of year (1-366)
  const start = new Date(epochDate.getFullYear(), 0, 0);
  const diff = epochDate.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Mean anomaly (simplified)
  const M = ((2 * Math.PI) / 365.25) * (dayOfYear - 2); // Jan 2 = perihelion approx

  // Equation of center (first two terms)
  const C = 0.0334 * Math.sin(M) + 0.000349 * Math.sin(2 * M);

  // Ecliptic longitude
  const lambda = M + C + Math.PI + (2 * Math.PI * 102.9) / 360; // 102.9° = longitude of perihelion

  // Obliquity of ecliptic
  const epsilon = 23.4393 * DEG_TO_RAD;

  // Sun declination
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Sun right ascension
  const rightAscension = Math.atan2(
    Math.cos(epsilon) * Math.sin(lambda),
    Math.cos(lambda),
  );

  // Earth-Sun distance (AU) — seasonal variation
  const earthSunDistance = 1.0 - 0.0167 * Math.cos(M);

  return { declination, rightAscension, earthSunDistance };
}

/**
 * Calculate orbital period for circular orbit.
 * T = 2π * sqrt(a³/μ)
 */
function calculateOrbitalPeriod(altitudeKm: number): number {
  const a = (EARTH_RADIUS_KM + altitudeKm) * 1000; // semi-major axis in meters
  return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
}

/**
 * Calculate beta angle.
 * β = arcsin(cos(δ_sun)*sin(i)*sin(Ω - α_sun) + sin(δ_sun)*cos(i))
 */
function calculateBetaAngle(
  inclination: number,
  raan: number,
  sunDeclination: number,
  sunRA: number,
): number {
  const i = inclination * DEG_TO_RAD;
  const omega = raan * DEG_TO_RAD;

  const beta = Math.asin(
    Math.cos(sunDeclination) * Math.sin(i) * Math.sin(omega - sunRA) +
      Math.sin(sunDeclination) * Math.cos(i),
  );

  return beta * RAD_TO_DEG;
}

/**
 * Calculate view factor to Earth from orbit altitude.
 * F_earth ≈ sin²(ρ) where ρ = arcsin(R_earth / (R_earth + altitude))
 */
function calculateEarthViewFactor(altitudeKm: number): number {
  const rho = Math.asin(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm));
  return Math.pow(Math.sin(rho), 2);
}

/**
 * Calculate eclipse fraction using cylindrical shadow model.
 * For LEO circular orbits.
 */
function calculateEclipseFraction(
  altitudeKm: number,
  betaAngleDeg: number,
): number {
  const betaRad = Math.abs(betaAngleDeg) * DEG_TO_RAD;
  const orbitRadius = EARTH_RADIUS_KM + altitudeKm;

  // Angular radius of Earth as seen from orbit
  const rhoRad = Math.asin(EARTH_RADIUS_KM / orbitRadius);

  // Check if orbit is fully sunlit (no eclipse)
  // This happens when |beta| > 90° - rho (edge-on to shadow)
  const betaLimit = Math.PI / 2 - rhoRad;
  if (betaRad >= betaLimit) {
    return 0; // No eclipse
  }

  // Eclipse half-angle (cylindrical shadow model)
  // cos(θ_eclipse) = sqrt(h² + 2*R_e*h) / ((R_e + h) * cos(β))
  // where h = altitude
  const h = altitudeKm;
  const Re = EARTH_RADIUS_KM;
  const cosArg = Math.sqrt(h * h + 2 * Re * h) / ((Re + h) * Math.cos(betaRad));

  if (cosArg >= 1) {
    return 0; // No eclipse
  }

  const eclipseHalfAngle = Math.acos(cosArg);
  const eclipseFraction = eclipseHalfAngle / Math.PI;

  return Math.min(Math.max(eclipseFraction, 0), 0.5); // Cap at 50%
}

/**
 * Calculate complete orbital environment from configuration.
 */
export function calculateOrbitalEnvironment(
  config: OrbitalConfig,
): OrbitalEnvironment {
  const epochDate = new Date(config.epoch);
  const sunPos = getSunPosition(epochDate);

  const orbitalPeriod = calculateOrbitalPeriod(config.altitude);
  const betaAngle = calculateBetaAngle(
    config.inclination,
    config.raan,
    sunPos.declination,
    sunPos.rightAscension,
  );
  const eclipseFraction = calculateEclipseFraction(config.altitude, betaAngle);
  const earthViewFactor = calculateEarthViewFactor(config.altitude);

  // Solar flux with seasonal distance correction
  const solarFlux = SOLAR_CONSTANT / Math.pow(sunPos.earthSunDistance, 2);

  // Peak albedo flux (at subsolar point)
  const albedoFlux = EARTH_ALBEDO * solarFlux * earthViewFactor;

  // Earth IR (fairly constant)
  const earthIRFlux = EARTH_IR * earthViewFactor;

  return {
    orbitalPeriod,
    betaAngle,
    eclipseFraction,
    solarFlux,
    albedoFlux,
    earthIR: earthIRFlux,
    earthViewFactor,
    sunlitFraction: 1 - eclipseFraction,
  };
}

/**
 * Generate time-varying heat load profile over one orbit.
 * Discretizes the orbit into N steps and computes fluxes at each step.
 */
export function generateOrbitalHeatProfile(
  config: OrbitalConfig,
  env: OrbitalEnvironment,
  numSteps: number = 360,
): OrbitalHeatProfile {
  const times: number[] = [];
  const solarFluxProfile: number[] = [];
  const albedoFluxProfile: number[] = [];
  const earthIRProfile: number[] = [];
  const inSunlightProfile: boolean[] = [];

  const dt = env.orbitalPeriod / numSteps;
  const eclipseStart = (0.5 - env.eclipseFraction / 2) * env.orbitalPeriod;
  const eclipseEnd = (0.5 + env.eclipseFraction / 2) * env.orbitalPeriod;

  for (let i = 0; i < numSteps; i++) {
    const t = i * dt;
    times.push(t);

    // Determine if in sunlight
    const inSunlight = t < eclipseStart || t > eclipseEnd;
    inSunlightProfile.push(inSunlight);

    if (inSunlight) {
      // Compute angle from subsolar point for albedo variation
      // Simplified: assume cos variation with orbit angle
      const orbitAngle = (2 * Math.PI * t) / env.orbitalPeriod;
      const cosAngle = Math.max(0, Math.cos(orbitAngle));

      solarFluxProfile.push(env.solarFlux);
      albedoFluxProfile.push(
        EARTH_ALBEDO * env.solarFlux * env.earthViewFactor * cosAngle,
      );
    } else {
      solarFluxProfile.push(0);
      albedoFluxProfile.push(0);
    }

    // Earth IR is roughly constant around the orbit
    earthIRProfile.push(env.earthIR);
  }

  return {
    times,
    solarFlux: solarFluxProfile,
    albedoFlux: albedoFluxProfile,
    earthIR: earthIRProfile,
    inSunlight: inSunlightProfile,
  };
}
