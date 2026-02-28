import { z } from 'zod';

export const orbitalConfigSchema = z.object({
  orbitType: z.enum(['leo', 'meo', 'geo', 'heo']).optional(),
  altitude: z.number().min(160).max(50000), // km
  inclination: z.number().min(0).max(180), // degrees
  raan: z.number().min(0).max(360), // degrees
  epoch: z.string().datetime(), // ISO 8601
  apogeeAltitude: z.number().min(200).max(100000).optional(), // km, HEO
  perigeeAltitude: z.number().min(160).max(100000).optional(), // km, HEO
});

export const createModelSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .default(''),
  orbitalConfig: orbitalConfigSchema.optional(),
});

export const updateModelSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  orbitalConfig: orbitalConfigSchema.nullable().optional(),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
