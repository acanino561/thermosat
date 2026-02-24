import { NextResponse } from 'next/server';
import { calculateOrbitalEnvSchema } from '@/lib/validators/orbital';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import {
  calculateOrbitalEnvironment,
  generateOrbitalHeatProfile,
} from '@/lib/solver/orbital-environment';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = calculateOrbitalEnvSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const config = {
      altitude: parsed.data.altitude,
      inclination: parsed.data.inclination,
      raan: parsed.data.raan,
      epoch: parsed.data.epoch,
    };

    const environment = calculateOrbitalEnvironment(config);
    const profile = generateOrbitalHeatProfile(config, environment, 360);

    return NextResponse.json({
      environment: {
        orbitalPeriod: {
          value: environment.orbitalPeriod,
          unit: 'seconds',
        },
        betaAngle: {
          value: environment.betaAngle,
          unit: 'degrees',
        },
        eclipseFraction: {
          value: environment.eclipseFraction,
          unit: 'fraction',
        },
        sunlitFraction: {
          value: environment.sunlitFraction,
          unit: 'fraction',
        },
        solarFlux: {
          value: environment.solarFlux,
          unit: 'W/m²',
        },
        albedoFlux: {
          value: environment.albedoFlux,
          unit: 'W/m²',
        },
        earthIR: {
          value: environment.earthIR,
          unit: 'W/m²',
        },
        earthViewFactor: {
          value: environment.earthViewFactor,
          unit: 'dimensionless',
        },
      },
      profile: {
        description: 'Heat flux profile over one orbit',
        numSteps: profile.times.length,
        orbitalPeriod: environment.orbitalPeriod,
        times: profile.times,
        solarFlux: profile.solarFlux,
        albedoFlux: profile.albedoFlux,
        earthIR: profile.earthIR,
        inSunlight: profile.inSunlight,
      },
    });
  } catch (error) {
    console.error('POST /api/orbital-env error:', error);
    return serverErrorResponse();
  }
}
