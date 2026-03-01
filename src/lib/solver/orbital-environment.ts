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
 * Calculate GEO eclipse fraction based on equinox seasons.
 * Eclipse only occurs ±23 days around equinoxes (day ~80 and ~266).
 */
function calculateGeoEclipseFraction(epochDate: Date): number {
  const start = new Date(epochDate.getFullYear(), 0, 0);
  const diff = epochDate.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const EQUINOX_SPRING = 80; // ~March 21
  const EQUINOX_AUTUMN = 266; // ~September 23
  const EQUINOX_WINDOW = 23; // days

  const nearSpring = Math.abs(dayOfYear - EQUINOX_SPRING) <= EQUINOX_WINDOW;
  const nearAutumn = Math.abs(dayOfYear - EQUINOX_AUTUMN) <= EQUINOX_WINDOW;

  return (nearSpring || nearAutumn) ? 0.05 : 0;
}

/**
 * Calculate HEO orbital period using Kepler's third law.
 * T = 2π * sqrt(a³ / GM)
 */
function calculateHeoOrbitalPeriod(apogeeAltKm: number, perigeeAltKm: number): number {
  const rApogee = (EARTH_RADIUS_KM + apogeeAltKm) * 1000; // meters
  const rPerigee = (EARTH_RADIUS_KM + perigeeAltKm) * 1000; // meters
  const a = (rApogee + rPerigee) / 2; // semi-major axis
  return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
}

/**
 * Calculate HEO eccentricity.
 */
function calculateHeoEccentricity(apogeeAltKm: number, perigeeAltKm: number): number {
  const rApogee = EARTH_RADIUS_KM + apogeeAltKm;
  const rPerigee = EARTH_RADIUS_KM + perigeeAltKm;
  return (rApogee - rPerigee) / (rApogee + rPerigee);
}

/**
 * Calculate HEO eclipse fraction using simplified model.
 * Eclipse mainly occurs near perigee. Weighted by time fraction spent near perigee.
 */
function calculateHeoEclipseFraction(
  apogeeAltKm: number,
  perigeeAltKm: number,
  betaAngleDeg: number,
): number {
  // Eclipse fraction at perigee altitude (as if circular orbit at perigee)
  const perigeeEclipse = calculateEclipseFraction(perigeeAltKm, betaAngleDeg);

  // Fraction of time spent near perigee — approximated from eccentricity
  // For highly elliptical orbits, spacecraft spends most time near apogee
  // perigee_time_fraction ≈ (1 - e)^(3/2) / (1 + e)^(3/2) is one approximation
  // Simpler: use ~1/6 for Molniya-class, scale with eccentricity
  const e = calculateHeoEccentricity(apogeeAltKm, perigeeAltKm);
  const perigeeTimeFraction = Math.pow((1 - e) / (1 + e), 1.5);

  return perigeeEclipse * perigeeTimeFraction;
}

/**
 * Compute spacecraft position and velocity direction in ECI for a circular orbit.
 * Returns position vector (metres) and velocity unit vector.
 */
export function computeSpacecraftPositionECI(
  config: OrbitalConfig,
  t: number,
): { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } } {
  const a = (EARTH_RADIUS_KM + config.altitude) * 1000; // metres
  const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
  const omega = (2 * Math.PI) / T;
  const theta = omega * t;

  const i = config.inclination * DEG_TO_RAD;
  const RAAN = config.raan * DEG_TO_RAD;

  const cosR = Math.cos(RAAN);
  const sinR = Math.sin(RAAN);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const position = {
    x: a * (cosR * cosT - sinR * cosI * sinT),
    y: a * (sinR * cosT + cosR * cosI * sinT),
    z: a * (sinI * sinT),
  };

  const vx = -cosR * sinT - sinR * cosI * cosT;
  const vy = -sinR * sinT + cosR * cosI * cosT;
  const vz = sinI * cosT;
  const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);

  const velocity = { x: vx / vLen, y: vy / vLen, z: vz / vLen };

  return { position, velocity };
}

/**
 * Convert a sun direction from ECI to LVLH frame.
 * LVLH: +x = along-track (velocity), +y = orbit normal, +z = nadir.
 */
export function computeSunDirectionLVLH(
  sunECI: { x: number; y: number; z: number },
  posECI: { x: number; y: number; z: number },
  velECI: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  // x̂_LVLH = velocity direction (already unit vector)
  const xHat = velECI;

  // ẑ_LVLH = -r̂ (nadir)
  const rLen = Math.sqrt(posECI.x * posECI.x + posECI.y * posECI.y + posECI.z * posECI.z);
  const zHat = { x: -posECI.x / rLen, y: -posECI.y / rLen, z: -posECI.z / rLen };

  // ŷ_LVLH = x̂ × ẑ  (orbit normal — angular momentum direction)
  const yHat = {
    x: xHat.y * zHat.z - xHat.z * zHat.y,
    y: xHat.z * zHat.x - xHat.x * zHat.z,
    z: xHat.x * zHat.y - xHat.y * zHat.x,
  };

  return {
    x: sunECI.x * xHat.x + sunECI.y * xHat.y + sunECI.z * xHat.z,
    y: sunECI.x * yHat.x + sunECI.y * yHat.y + sunECI.z * yHat.z,
    z: sunECI.x * zHat.x + sunECI.y * zHat.y + sunECI.z * zHat.z,
  };
}

/**
 * Calculate complete orbital environment from configuration.
 */
export function calculateOrbitalEnvironment(
  config: OrbitalConfig,
): OrbitalEnvironment {
  const epochDate = new Date(config.epoch);
  const sunPos = getSunPosition(epochDate);
  const orbitType = config.orbitType ?? 'leo';

  // Solar flux with seasonal distance correction (same for all orbit types)
  const solarFlux = SOLAR_CONSTANT / Math.pow(sunPos.earthSunDistance, 2);

  if (orbitType === 'geo') {
    const GEO_ALTITUDE = 35786; // km
    const orbitalPeriod = 86400; // 24 hours exactly
    const betaAngle = calculateBetaAngle(
      config.inclination,
      config.raan,
      sunPos.declination,
      sunPos.rightAscension,
    );
    const eclipseFraction = calculateGeoEclipseFraction(epochDate);
    const earthViewFactor = calculateEarthViewFactor(GEO_ALTITUDE);

    // Albedo negligible at GEO altitude
    const albedoFlux = 0;

    // Earth IR reduced by inverse square of distance
    const r = EARTH_RADIUS_KM + GEO_ALTITUDE;
    const earthIRFlux = EARTH_IR * Math.pow(EARTH_RADIUS_KM / r, 2);

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

  if (orbitType === 'heo') {
    const apogeeAlt = config.apogeeAltitude!;
    const perigeeAlt = config.perigeeAltitude!;

    const orbitalPeriod = calculateHeoOrbitalPeriod(apogeeAlt, perigeeAlt);
    const betaAngle = calculateBetaAngle(
      config.inclination,
      config.raan,
      sunPos.declination,
      sunPos.rightAscension,
    );
    const eclipseFraction = calculateHeoEclipseFraction(apogeeAlt, perigeeAlt, betaAngle);

    // Use average altitude for albedo/OLR
    const avgAltitude = (apogeeAlt + perigeeAlt) / 2;
    const earthViewFactor = calculateEarthViewFactor(avgAltitude);

    // Albedo reduced at high altitude
    const albedoFlux = EARTH_ALBEDO * solarFlux * earthViewFactor;

    // Earth IR reduced by altitude
    const r = EARTH_RADIUS_KM + avgAltitude;
    const earthIRFlux = EARTH_IR * Math.pow(EARTH_RADIUS_KM / r, 2);

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

  // LEO / MEO (existing behavior)
  const orbitalPeriod = calculateOrbitalPeriod(config.altitude);
  const betaAngle = calculateBetaAngle(
    config.inclination,
    config.raan,
    sunPos.declination,
    sunPos.rightAscension,
  );
  const eclipseFraction = calculateEclipseFraction(config.altitude, betaAngle);
  const earthViewFactor = calculateEarthViewFactor(config.altitude);

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
 * Calculate the Sun's ECI direction vector for a given orbital config and elapsed time.
 * Returns a normalized THREE-compatible {x, y, z} object.
 */
export function computeSunDirectionAtTime(
  config: OrbitalConfig,
  elapsedSeconds: number,
): { x: number; y: number; z: number } {
  const epochDate = new Date(config.epoch);
  const currentDate = new Date(epochDate.getTime() + elapsedSeconds * 1000);
  const sunPos = getSunPosition(currentDate);

  // Sun direction in ECI: convert RA/Dec to unit vector
  const x = Math.cos(sunPos.declination) * Math.cos(sunPos.rightAscension);
  const y = Math.sin(sunPos.declination);
  const z = Math.cos(sunPos.declination) * Math.sin(sunPos.rightAscension);

  const len = Math.sqrt(x * x + y * y + z * z);
  return { x: x / len, y: y / len, z: z / len };
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
  const sunDirectionLVLH: Array<{ x: number; y: number; z: number }> = [];

  const dt = env.orbitalPeriod / numSteps;
  const eclipseStart = (0.5 - env.eclipseFraction / 2) * env.orbitalPeriod;
  const eclipseEnd = (0.5 + env.eclipseFraction / 2) * env.orbitalPeriod;

  const hasOrbitalElements = config.inclination != null && config.raan != null;

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

    // Compute sun direction in LVLH frame
    if (hasOrbitalElements) {
      const sunECI = computeSunDirectionAtTime(config, t);
      const posVel = computeSpacecraftPositionECI(config, t);
      const sunLVLH = computeSunDirectionLVLH(sunECI, posVel.position, posVel.velocity);
      sunDirectionLVLH.push(sunLVLH);
    } else {
      sunDirectionLVLH.push({ x: 0, y: 0, z: 0 });
    }
  }

  return {
    times,
    solarFlux: solarFluxProfile,
    albedoFlux: albedoFluxProfile,
    earthIR: earthIRProfile,
    inSunlight: inSunlightProfile,
    sunDirectionLVLH,
  };
}
