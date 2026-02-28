import { z } from 'zod';

export const orbitTypeSchema = z.enum(['leo', 'meo', 'geo', 'heo']).default('leo');

export const calculateOrbitalEnvSchema = z.object({
  orbitType: orbitTypeSchema.optional(),
  altitude: z.number().min(160).max(50000), // km, expanded for all orbit types
  inclination: z.number().min(0).max(180), // degrees
  raan: z.number().min(0).max(360), // degrees
  epoch: z.string().datetime(), // ISO 8601
  apogeeAltitude: z.number().min(200).max(100000).optional(), // km, HEO only
  perigeeAltitude: z.number().min(160).max(100000).optional(), // km, HEO only
}).refine((data) => {
  if (data.orbitType === 'heo') {
    return data.apogeeAltitude !== undefined && data.perigeeAltitude !== undefined;
  }
  return true;
}, {
  message: 'HEO orbits require apogeeAltitude and perigeeAltitude',
}).refine((data) => {
  if (data.orbitType === 'heo' && data.apogeeAltitude !== undefined && data.perigeeAltitude !== undefined) {
    return data.apogeeAltitude > data.perigeeAltitude;
  }
  return true;
}, {
  message: 'Apogee altitude must be greater than perigee altitude',
});

export type CalculateOrbitalEnvInput = z.infer<typeof calculateOrbitalEnvSchema>;
