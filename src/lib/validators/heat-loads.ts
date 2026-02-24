import { z } from 'zod';

export const heatLoadTypeSchema = z.enum(['constant', 'time_varying', 'orbital']);

export const timeValuePairSchema = z.object({
  time: z.number().min(0),
  value: z.number(),
});

export const orbitalHeatLoadParamsSchema = z.object({
  surfaceType: z.enum(['solar', 'earth_facing', 'anti_earth', 'custom']),
  absorptivity: z.number().min(0).max(1),
  emissivity: z.number().min(0).max(1),
  area: z.number().positive(),
});

export const createHeatLoadSchema = z
  .object({
    name: z.string().min(1).max(200),
    nodeId: z.string().uuid(),
    loadType: heatLoadTypeSchema,
    value: z.number().optional(),
    timeValues: z.array(timeValuePairSchema).min(2).optional(),
    orbitalParams: orbitalHeatLoadParamsSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.loadType === 'constant') {
        return data.value !== undefined;
      }
      return true;
    },
    {
      message: 'Constant heat loads require a value',
      path: ['value'],
    },
  )
  .refine(
    (data) => {
      if (data.loadType === 'time_varying') {
        return data.timeValues !== undefined && data.timeValues.length >= 2;
      }
      return true;
    },
    {
      message: 'Time-varying heat loads require at least 2 time-value pairs',
      path: ['timeValues'],
    },
  )
  .refine(
    (data) => {
      if (data.loadType === 'orbital') {
        return data.orbitalParams !== undefined;
      }
      return true;
    },
    {
      message: 'Orbital heat loads require orbital parameters',
      path: ['orbitalParams'],
    },
  );

export const updateHeatLoadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nodeId: z.string().uuid().optional(),
  loadType: heatLoadTypeSchema.optional(),
  value: z.number().nullable().optional(),
  timeValues: z.array(timeValuePairSchema).min(2).nullable().optional(),
  orbitalParams: orbitalHeatLoadParamsSchema.nullable().optional(),
});

export type CreateHeatLoadInput = z.infer<typeof createHeatLoadSchema>;
export type UpdateHeatLoadInput = z.infer<typeof updateHeatLoadSchema>;
