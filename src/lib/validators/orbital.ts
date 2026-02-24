import { z } from 'zod';

export const calculateOrbitalEnvSchema = z.object({
  altitude: z.number().min(200).max(2000), // km, LEO range
  inclination: z.number().min(0).max(180), // degrees
  raan: z.number().min(0).max(360), // degrees
  epoch: z.string().datetime(), // ISO 8601
});

export type CalculateOrbitalEnvInput = z.infer<typeof calculateOrbitalEnvSchema>;
